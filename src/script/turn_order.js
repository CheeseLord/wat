/* global Crafty */

"use strict";

import {
    chooseAiAction,
} from  "./ai.js";
import {
    Highlight,
    NUM_TEAMS,
    PLAYER_TEAM,
    ClickEnum,
} from "./consts.js";
import {
    findPaths,
} from "./geometry.js";
import {
    clearAllHighlights,
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
    InteractAction,
    MoveAction,
} from "./action_type.js";
import {
    setGlobalState,
} from "./resolve_action.js";
import {
    setFocusOn,
} from "./view.js";

// TODO can we not export this? Or make it a UI-only thing?
// At the very least, selectedCharacter and checkSelectCharacter should be in
// the same file.
export let selectedCharacter;

///////////////////////////////////////////////////////////////////////////////
// Whose turn is it, anyway?

let currentTeamIndex   = 0;
let currentTeamMembers = [];

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
    highlightAvailableCharacters();

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
    setGlobalState(ClickEnum.NO_INPUT);
    deselectCharacter();

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
                loadLevel1(beginLevel);
            },
        ]]);
        return true;
    } else {
        return false;
    }
}


export function beginLevel(team) {
    clearAllHighlights();
    // TODO: Call clearMenu (from menu.js) instead. Can't do that right now
    // because of cyclic imports.
    Crafty.s("ButtonMenu").clearMenu();
    startTeam(team);
    assert(anyCharactersReady());
}

///////////////////////////////////////////////////////////////////////////////
// Requesting moves (TODO maybe put in different module?)

function requestMoveFromPlayer(character) {
    setGlobalState(ClickEnum.DEFAULT);
}

function requestMoveFromAI(character) {
    // TODO this creates the movement grid, don't want that.
    selectCharacter(character);
    let action = chooseAiAction(character);
    action.type.doit(action, () => {
        endCharacter(character);
    });
}

///////////////////////////////////////////////////////////////////////////////
// Menu-related action helpers (and some misc?)

export function afterPlayerMove() {
    // TODO: Call clearMenu (from menu.js) instead. Can't do that right now
    // because of cyclic imports.
    Crafty.s("ButtonMenu").clearMenu();
    endCharacter(selectedCharacter);
}

export function selectCharacter(character) {
    assert(character.has("Character"));
    assert(isOnCurrentTeam(character));
    deselectCharacter();
    selectedCharacter = character;
    selectedCharacter.setDefaultHighlight(Highlight.SELECTED_CHARACTER);
    updateAutoActions(character);
    createMovementGrid(character);
}

export function selectNextCharacter() {
    let index = currentTeamMembers.indexOf(selectedCharacter);
    let teamSize = currentTeamMembers.length;

    let i = (index + 1) % teamSize;
    while (!canMoveThisTurn(currentTeamMembers[i]) && i !== index) {
        i = (i + 1) % teamSize;
    }

    selectCharacter(currentTeamMembers[i]);
    return currentTeamMembers[i];
}

export function deselectCharacter() {
    clearAutoActions();

    if (selectedCharacter) {
        selectedCharacter = null;
    }
    // Clear movement grid and highlighting of selectedCharacter.
    clearAllHighlights();
    highlightAvailableCharacters();
}

function highlightAvailableCharacters() {
    let availCharacters = getAllReadyCharacters();
    for (let i = 0; i < availCharacters.length; i++) {
        availCharacters[i].setDefaultHighlight(Highlight.AVAILABLE_CHARACTER);
    }
}

///////////////////////////////////////////////////////////////////////////////
// AutoAction stuff
//
// TODO: Probably don't belong in this file.

function updateAutoActions(subject) {
    let subjectPos = subject.getPos();
    let theMap = findPaths(subjectPos, subject.actionPoints);
    Crafty("GridObject").each(function() {
        let target = this;
        this.autoAction = null;
        // Hack: try to recompute those cases where UI will intercept the click
        // and not use the auto action. This logic is probably not quite right.
        // Should probably instead have UI get a say in the highlighting rather
        // than always using the autoAction.
        if (target.has("Character") && target.team === subject.team) {
            return;
        }
        let tryActionTypes = [
            InteractAction,
            MoveAction,
            subject.defaultAttack,
        ];
        for (let i = 0; i < tryActionTypes.length; i++) {
            let tryAction = tryActionTypes[i].tryInitAutoAction(subject,
                target, theMap);
            if (tryAction !== null && tryAction.type.check(tryAction).valid) {
                this.autoAction = tryAction;
                break;
            }
        }
        // If none were valid, we already set autoAction to null above.
    });
}

function clearAutoActions() {
    Crafty("GridObject").each(function() {
        this.autoAction = null;
    });
}

