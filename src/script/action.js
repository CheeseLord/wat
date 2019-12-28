/* global Crafty */

"use strict";

import {
    ANIM_DUR_HALF_ATTACK,
    ANIM_DUR_MOVE,
    ANIM_DUR_PAUSE_BW_MOV_ATK,
    ANIM_DUR_STEP,
    ATTACK_DAMAGE_MIN,
    ATTACK_DAMAGE_MAX,
    AutoActionEnum,
    SPECIAL_ATTACK_DAMAGE_MIN,
    SPECIAL_ATTACK_DAMAGE_MAX,
    Highlight,
    NUM_TEAMS,
    PLAYER_TEAM,
    StateEnum,
} from "./consts.js";
import {
    canMoveTo,
    findPaths,
    getPath,
    isAdjacent,
    isReachable,
    midpoint,
    getDist,
} from "./geometry.js";
import {
    doAnimate,
    parallelAnimations,
    pauseAnimation,
    seriesAnimations,
    tweenAnimation,
} from "./animation.js";
import {
    assert,
    debugLog,
    internalError,
    userError,
    userMessage,
} from "./message.js";
import {
    randInt,
} from "./util.js";
import {
    setFocusOn,
} from "./view.js";

export var selectedCharacter;

// In JavaScript, if you import a variable and then assign a new value to it,
// other modules don't see the new value. Therefore, instead of allowing other
// modules import globalState directly, have them access it through
// {get,set}GlobalState.
var globalState = StateEnum.DEFAULT;
export function getGlobalState() { return globalState; }
export function setGlobalState(newState) { globalState = newState; }

export var readyCharacters = [];
export var currentTeam = 0;
export function getReadyCharacters() { return readyCharacters; }
export function getCurrentTeam() { return currentTeam; }

///////////////////////////////////////////////////////////////////////////////
// "Janky class" ActionDesc -- describes an action that will be taken.
// Type identified by the 'type' field, a member of ActionType.
// Other fields based on type, see factory functions below.

export const ActionType = Object.freeze({
    MOVE:           {},
    ATTACK:         {},
    INTERACT:       {},
    SWAP_PLACES:    {},
    SPECIAL_ATTACK: {},
    AUTO_ATTACK:    {},
    END_TURN:       {},
});

export function moveAction(subject, path) {
    return {
        type:    ActionType.MOVE,
        subject: subject,
        path:    path,
    };
}

export function attackAction(subject, target, path) {
    return actionWithPathAndTarget(ActionType.ATTACK, subject, target, path);
}

export function interactAction(subject, target, path) {
    return actionWithPathAndTarget(ActionType.INTERACT, subject, target, path);
}

export function swapPlacesAction(subject, target) {
    return {
        type:    ActionType.SWAP_PLACES,
        subject: subject,
        target:  target,
    };
}

export function specialAttackAction(subject) {
    return nullaryAction(ActionType.SPECIAL_ATTACK, subject);
}

// TODO this shouldn't be an action type.
export function autoAttackAction(subject) {
    return nullaryAction(ActionType.AUTO_ATTACK, subject);
}

export function endTurnAction(subject) {
    return nullaryAction(ActionType.END_TURN, subject);
}

function actionWithPathAndTarget(type, subject, target, path) {
    return {
        type:    type,
        subject: subject,
        path:    path,
        target:  target,
    };
}

function nullaryAction(type, subject) {
    return {
        type:    type,
        subject: subject,
    };
}

///////////////////////////////////////////////////////////////////////////////
// Action handlers

export function checkMove(target, x, y) {
    let theMap = findPaths(
        selectedCharacter.getPos(),
        selectedCharacter.speed,
    );
    let destPos = {x: x, y: y};

    if (target && target.blocksMovement) {
        return failCheck("Can't move there; something's in the way.");
    } else if (!canMoveTo(theMap, destPos)) {
        return failCheck("You can't move that far.");
    } else {
        return passCheck();
    }
}

export function doMove(target, x, y, callback) {
    if (!selectedCharacter) {
        internalError("No character selected.");
        return;
    }

    assert(checkMove(target, x, y).valid);

    let theMap = findPaths(
        selectedCharacter.getPos(),
        selectedCharacter.speed,
    );
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedCharacter.getPos(), destPos);

    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    doAnimate(seriesAnimations(anims), callback);
}

export function checkSwap(target, x, y) {
    if (target === null) {
        return failCheck("There's nothing there to swap with.");
    } else if (!target.has("Character")) {
        return failCheck("Can't swap with non-character.");
    } else if (target.team !== currentTeam) {
        return failCheck("Cannot swap with other player's unit.");
    } else if (target === selectedCharacter) {
        return failCheck("Cannot swap character with self.");
    } else {
        return passCheck();
    }
}

export function doSwap(target, x, y, callback) {
    if (!selectedCharacter) {
        internalError("No character selected.");
        return;
    }

    assert(checkSwap(target, x, y).valid);

    // Swap positions of clicked character and selectedCharacter.
    let selectPos = selectedCharacter.getPos();
    let clickPos  = target.getPos();
    doAnimate(
        parallelAnimations([
            tweenAnimation(selectedCharacter, function() {
                selectedCharacter.animateTo(clickPos, ANIM_DUR_MOVE);
            }),
            tweenAnimation(target, function() {
                target.animateTo(selectPos, ANIM_DUR_MOVE);
            }),
        ]),
        callback
    );
}

export function checkInteract(target, x, y) {
    if (target === null) {
        return failCheck("Nothing there to interact with.");
    } else if (!target.has("Interactable")) {
        return failCheck("Can't interact with that.");
    } else {
        return passCheck();
    }
}

export function doInteract(target, x, y, callback) {
    if (!selectedCharacter) {
        internalError("No character selected.");
        return;
    }

    assert(checkInteract(target, x, y).valid);

    // Do a move-and-interact.
    // TODO: Wait, we really don't already have a map?
    let theMap = findPaths(
        selectedCharacter.getPos(),
        selectedCharacter.speed,
    );
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedCharacter.getPos(), destPos);
    if (path === null) {
        userError("Can't reach that to interact with it.");
        return;
    }
    assert(path.length > 1);
    path.pop();

    // TODO: Refactor with doMove.
    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    // TODO some sort of animation for the interaction itself?
    doAnimate(seriesAnimations(anims), function() {
        target.interact(selectedCharacter);
        callback();
    });
}

export function checkAttack(target, x, y) {
    if (target === null) {
        return failCheck("No enemy there.");
    } else if (!target.has("Character")) {
        return failCheck("Can't attack non-character.");
    } else if (target.team === currentTeam) {
        return failCheck("Can't attack friendly unit.");
    } else {
        return passCheck();
    }
}

export function doAttack(target, x, y, callback) {
    if (!selectedCharacter) {
        internalError("No character selected.");
        return;
    }

    assert(checkAttack(target, x, y).valid);

    let theMap = findPaths(
        selectedCharacter.getPos(),
        selectedCharacter.speed,
    );
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedCharacter.getPos(), destPos);
    if (path === null) {
        userError("Can't reach that to attack it.");
        return;
    }
    let moveToPos = selectedCharacter.getPos();
    if (path.length > 1) {
        path.pop();
        moveToPos = path[path.length - 1];
    } else {
        assert(false);
    }

    userMessage(`${selectedCharacter.name_} moved to ` +
        `(${moveToPos.x}, ${moveToPos.y})`);
    userMessage(`${selectedCharacter.name_} attacked ${target.name_}`);

    // TODO: Refactor with doMove.
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }

    // Pause between move and attack, but only if we actually moved.
    if (anims.length > 0) {
        anims.push(pauseAnimation(ANIM_DUR_PAUSE_BW_MOV_ATK));
    }

    // Add the attack animation, regardless.
    let halfPos = midpoint(moveToPos, target.getPos());
    anims = anims.concat([
        tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
        }),
        tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(moveToPos, ANIM_DUR_HALF_ATTACK);
        }),
    ]);

    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    doAnimate(
        seriesAnimations(anims), function() {
            target.takeDamage(randInt(ATTACK_DAMAGE_MIN, ATTACK_DAMAGE_MAX));
            callback();
        }
    );
}

// All check* functions return either:
//   - { valid: true }                     if the action is allowed
//   - { valid: false, reason: <string> }  if not
//     (where .reason is a string suitable for displaying to the user).
// These are helper functions for generating those objects, to avoid writing a
// whole bunch of object literals.
function passCheck() {
    return {valid: true};
}
function failCheck(reason) {
    return {valid: false, reason: reason};
}

///////////////////////////////////////////////////////////////////////////////
// "Milestones" in turn order

export function startTeam(team) {
    debugLog(`Starting turn for team ${team}.`);

    currentTeam = team;
    readyCharacters = [];
    Crafty("Character").each(function() {
        if (this.team === team) {
            readyCharacters.push(this);
        }
    });

    if (readyCharacters.length > 0) {
        startCharacter(readyCharacters[0]);
    }
}

function startCharacter(character) {
    clearAllHighlights();
    for (let i = 0; i < readyCharacters.length; i++) {
        readyCharacters[i].enableHighlight(Highlight.AVAILABLE_CHARACTER);
    }

    // TODO: Why does startCharacter not call selectCharacter? Who calls it
    // instead?
    // TODO: Should we select them, too?
    setFocusOn(character, function() {
        // TODO refactor this. Have a real concept of teams, probably with some
        // sort of callback tied to each one specifying how it chooses its
        // turns.
        if (currentTeam === PLAYER_TEAM) {
            requestMoveFromPlayer(character);
        } else {
            requestMoveFromAI(character);
        }
    });
}

export function endCharacter(character) {
    setGlobalState(StateEnum.NO_INPUT);
    deselectCharacter();

    // Unready the current character.
    let index = readyCharacters.indexOf(character);
    if (index === -1) {
        // TODO: We should never get here, but handle it better anyway.
        return;
    } else {
        readyCharacters.splice(index, 1);
    }

    if (checkForGameEnd()) {
        // Don't continue the game loop.
        // checkForGameEnd already did whatever's appropriate to signal to the
        // player that the game is over.
    } else if (readyCharacters.length > 0) {
        // There are still more characters to move.
        startCharacter(readyCharacters[0]);
    } else {
        // This was the last character on the team; end the team's turn.
        endTeam();
    }
}

export function endTeam() {
    debugLog(`Reached end of turn for team ${currentTeam}.`);

    let team = currentTeam;
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
    } while (readyCharacters.length === 0 && maxTries > 0);

    if (readyCharacters.length === 0) {
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
            // Hack to restart. Just refresh the page.
            // TODO: Actually reset the state ourselves.
            () => { window.location.reload(); },
        ]]);
        return true;
    } else {
        return false;
    }
}

///////////////////////////////////////////////////////////////////////////////
// Requesting moves (TODO maybe put in different module?)

function requestMoveFromPlayer(character) {
    setGlobalState(StateEnum.DEFAULT);
}

function requestMoveFromAI(character) {
    // TODO this creates the movement grid, don't want that.
    // TODO sometimes this goes into an infinite loop.
    selectCharacter(character);
    doAutoAttack(character, () => {
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
    assert(character.team === currentTeam);
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

function highlightPath(path) {
    for (var i = 0; i < path.length; i++) {
        Crafty("Ground").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                if (i === path.length - 1) {
                    this.enableHighlight(Highlight.ANIM_MOVE_END);
                } else {
                    this.enableHighlight(Highlight.ANIM_MOVE_MIDDLE);
                }
            }
        });
    }
}

function clearHighlightType(hlType) {
    Crafty("GridObject").each(function() {
        this.disableHighlight(hlType);
    });
}
function clearAllHighlights() {
    Crafty("GridObject").each(function() {
        this.clearHighlights();
    });
}

function createMovementGrid(character) {
    Crafty("GridObject").each(function() {
        // Note: don't need to check isReachable here, since we only set
        // autoActions on objects that are in range.
        if (this.autoAction === AutoActionEnum.MOVE) {
            this.enableHighlight(Highlight.CAN_MOVE);
        } else if (this.autoAction === AutoActionEnum.ATTACK) {
            this.enableHighlight(Highlight.CAN_ATTACK);
        } else if (this.autoAction === AutoActionEnum.INTERACT) {
            this.enableHighlight(Highlight.CAN_INTERACT);
        } else if (this.autoAction !== AutoActionEnum.NONE) {
            assert(false);
        }
    });
}

export function specialAttack(character) {
    Crafty("Character").each(function() {
        if (this.team !== character.team &&
                isAdjacent(character.getPos(), this.getPos())) {
            this.takeDamage(randInt(SPECIAL_ATTACK_DAMAGE_MIN,
                SPECIAL_ATTACK_DAMAGE_MAX));
        }
    });
}

export function canAttack(character, target) {
    return target.has("Character") && target.team !== character.team;
}

export function canInteract(character, target) {
    return target.has("Interactable");
}

export function updateAutoActions(character) {
    let characterPos = character.getPos();
    let theMap = findPaths(characterPos, character.speed);
    Crafty("GridObject").each(function() {
        let canReach = isReachable(theMap, this.getPos());
        if (canReach && canInteract(character, this)) {
            this.autoAction = AutoActionEnum.INTERACT;
        } else if (canReach && canAttack(character, this)) {
            this.autoAction = AutoActionEnum.ATTACK;
        } else if (canMoveTo(theMap, this.getPos())) {
            this.autoAction = AutoActionEnum.MOVE;
        } else {
            this.autoAction = AutoActionEnum.NONE;
        }
    });
}

export function doAutoAttack(character, callback) {
    let characterPos = character.getPos();
    let theMap = findPaths(characterPos, 2 * character.speed);
    let nearestTarget = null;
    let bestDist = Infinity;
    let dist = null;
    Crafty("Character").each(function() {
        if (this.team === character.team) {
            return;
        }
        dist = getDist(theMap, characterPos, this.getPos());
        if (dist < bestDist) {
            bestDist = dist;
            nearestTarget = this;
        }
    });
    if (nearestTarget === null) {
        endCharacter(character);
    } else if (getDist(theMap, characterPos, nearestTarget.getPos()) <=
               character.speed) {
        let pos = nearestTarget.getPos();
        doAttack(nearestTarget, pos.x, pos.y, callback);
    } else {
        let path = getPath(
            theMap,
            character.getPos(),
            nearestTarget.getPos()
        );
        let target = null;
        let x = path[character.speed].x;
        let y = path[character.speed].y;
        Crafty("Ground").each(function() {
            if (this.getPos().x === x && this.getPos().y === y) {
                target = this;
            }
        });
        if (target === null) {
            endCharacter(character);
        } else {
            doMove(target, x, y, callback);
        }
    }
}

export function clearAutoActions() {
    Crafty("GridObject").each(function() {
        this.autoAction = AutoActionEnum.NONE;
    });
}

