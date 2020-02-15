/* global Crafty */

"use strict";

import {
    chooseAiAction,
    clearAutoActions,
    doAction,
    setGlobalState,
    updateAutoActions,
} from "./action.js";
import {
    Highlight,
    NUM_TEAMS,
    PLAYER_TEAM,
    StateEnum,
} from "./consts.js";
import {
    clearAllHighlights,
    clearHighlightType,
    createMovementGrid,
} from "./highlight.js";
import {
    loadLevel1,
} from "./levels.js";
import {
    assert,
    debugLog,
    internalError,
    userMessage,
} from "./message.js";
import {
    setFocusOn,
} from "./view.js";

// TODO can we not export this? Or make it a UI-only thing?
// At the very least, selectedCharacter and checkSelectCharacter should be in
// the same file.
export var selectedCharacter;

///////////////////////////////////////////////////////////////////////////////
// Whose turn is it, anyway?

var currentTeamIndex   = 0;
var currentTeamMembers = [];

// TODO these functions are only used by checkSelectCharacter.
export function isOnCurrentTeam(character) {
    return (character.team === currentTeamIndex);
}
export function canMoveThisTurn(character) {
    return (isOnCurrentTeam(character) && character.actionPoints > 0);
}

function anyCharactersReady() {
    return (getFirstReadyCharacter() !== null);
}

// Return the first character on the current team who can still move, or null
// if the whole team has finished moving.
function getFirstReadyCharacter() {
    for (let i = 0; i < currentTeamMembers.length; i++) {
        if (currentTeamMembers[i].actionPoints > 0) {
            return currentTeamMembers[i];
        }
    }
    return null;
}

function getAllReadyCharacters() {
    let ret = [];
    for (let i = 0; i < currentTeamMembers.length; i++) {
        if (currentTeamMembers[i].actionPoints > 0) {
            ret.push(currentTeamMembers[i]);
        }
    }
    return ret;
}

///////////////////////////////////////////////////////////////////////////////
// "Milestones" in turn order

export function startTeam(team) {
    debugLog(`Starting turn for team ${team}.`);

    currentTeamIndex = team;
    currentTeamMembers = [];
    Crafty("Character").each(function() {
        if (this.team === team) {
            this.readyActions();
            currentTeamMembers.push(this);
        }
    });

    let nextCharacter = getFirstReadyCharacter();
    if (nextCharacter !== null) {
        startCharacter(nextCharacter);
    }
    // Otherwise, intentionally don't ready anyone. This comes up because
    // endTeam calls startTeam speculatively on each subsequent team, searching
    // for one that has someone left on it to move.
    // TODO: This logic is somewhat confusing. Can we do it a different way?
}

function startCharacter(character) {
    // TODO Move this to requestMoveFromPlayer.
    clearAllHighlights();
    let availCharacters = getAllReadyCharacters();
    for (let i = 0; i < availCharacters.length; i++) {
        availCharacters[i].enableHighlight(Highlight.AVAILABLE_CHARACTER);
    }

    // TODO: Why does startCharacter not call selectCharacter? Who calls it
    // instead?
    // TODO: Should we select them, too?
    setFocusOn(character, function() {
        // TODO refactor this. Have a real concept of teams, probably with some
        // sort of callback tied to each one specifying how it chooses its
        // turns.
        if (currentTeamIndex === PLAYER_TEAM) {
            requestMoveFromPlayer(character);
        } else {
            requestMoveFromAI(character);
        }
    });
}

export function endCharacter(character) {
    setGlobalState(StateEnum.NO_INPUT);
    deselectCharacter();

    character.actionPoints -= 1;

    if (checkForGameEnd()) {
        // Don't continue the game loop.
        // checkForGameEnd already did whatever's appropriate to signal to the
        // player that the game is over.
    } else {
        let nextCharacter = getFirstReadyCharacter();
        if (nextCharacter !== null) {
            // There are still more characters to move.
            startCharacter(nextCharacter);
        } else {
            // This was the last character on the team; end the team's turn.
            endTeam();
        }
    }
}

export function endTeam() {
    debugLog(`Reached end of turn for team ${currentTeamIndex}.`);

    let team = currentTeamIndex;
    let maxTries = NUM_TEAMS;
    // If the next team has no one on it to act, skip over them. Repeat until
    // we find a team that has someone ready to act, or until we've tried all
    // teams.
    do {
        team = (team + 1) % NUM_TEAMS;
        // TODO: Maybe just have startTeam return success or failure? Or maybe
        // put this loop in startTeam?
        startTeam(team);
        maxTries--;
    } while (!anyCharactersReady() && maxTries > 0);

    if (!anyCharactersReady()) {
        assert(maxTries === 0);
        // Eventually, this should probably be detected and result in something
        // actually happening in-game. (Maybe a game-over screen since your
        // whole team is dead?)
        internalError("There's no one left to act.");
    }
}

///////////////////////////////////////////////////////////////////////////////
// Game over stuff

function checkForGameEnd() {
    let isDefeat  = true;
    let isVictory = true;
    Crafty("Character").each(function() {
        if (this.team === PLAYER_TEAM) {
            // He that hath a character left on Team 0 is more than a loss.
            isDefeat  = false;
        } else {
            // He that hath a character left on Team nonzero is less than a
            // victory.
            isVictory = false;
        }
    });

    if (isDefeat) {
        // He that is more than a loss is not for me.
        userMessage("You have lost.");
    } else if (isVictory) {
        // He that is less than a victory, I am not for him.
        userMessage("You have won.");
    }

    if (isDefeat || isVictory) {
        Crafty.s("ButtonMenu").setMenu("Game Over", [[
            "Restart",
            function() {
                loadLevel1();
                beginLevel(0);
            },
        ]]);
        return true;
    } else {
        return false;
    }
}


export function beginLevel(team) {
    startTeam(team);
    assert(anyCharactersReady());
}

///////////////////////////////////////////////////////////////////////////////
// Requesting moves (TODO maybe put in different module?)

function requestMoveFromPlayer(character) {
    setGlobalState(StateEnum.DEFAULT);
}

function requestMoveFromAI(character) {
    // TODO this creates the movement grid, don't want that.
    selectCharacter(character);
    doAction(chooseAiAction(character), () => {
        endCharacter(character);
    });
}

///////////////////////////////////////////////////////////////////////////////
// Menu-related action helpers (and some misc?)

export function afterPlayerMove() {
    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    endCharacter(selectedCharacter);
}

export function selectCharacter(character) {
    assert(character.has("Character"));
    assert(isOnCurrentTeam(character));
    deselectCharacter();
    selectedCharacter = character;
    selectedCharacter.enableHighlight(Highlight.SELECTED_CHARACTER);
    updateAutoActions(character);
    createMovementGrid(character);
}

export function deselectCharacter() {
    clearAutoActions();

    if (selectedCharacter) {
        selectedCharacter.disableHighlight(Highlight.SELECTED_CHARACTER);
        selectedCharacter = null;
    }
    // Clear movement grid.
    clearHighlightType(Highlight.CAN_MOVE);
    clearHighlightType(Highlight.CAN_ATTACK);
    clearHighlightType(Highlight.CAN_INTERACT);
}
