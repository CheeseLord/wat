/* global Crafty */

"use strict";

import {
    doAnimate,
    parallelAnimations,
    pauseAnimation,
    seriesAnimations,
    tweenAnimation,
} from "./animation.js";
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
    isPathValid,
    isReachable,
    midpoint,
    getDist,
} from "./geometry.js";
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

export function checkAction(action) {
    switch (action.type) {
        case ActionType.MOVE:
            return checkMove(action);
        case ActionType.ATTACK:
            return checkAttack(action);
        case ActionType.INTERACT:
            return checkInteract(action);
        case ActionType.SWAP_PLACES:
            return checkSwap(action);
        case ActionType.SPECIAL_ATTACK:
            return passCheck(); // TODO?
        case ActionType.AUTO_ATTACK:
            return passCheck(); // TODO! Shouldn't be an ActionType.
        case ActionType.END_TURN:
            return passCheck();
        default:
            internalError("Unknown ActionType");
            return failCheck("An internal error occurred.");
    }
}

export function doAction(action, callback) {
    switch (action.type) {
        case ActionType.MOVE:
            return doMove(action, callback);
        case ActionType.ATTACK:
            return doAttack(action, callback);
        case ActionType.INTERACT:
            return doInteract(action, callback);
        case ActionType.SWAP_PLACES:
            return doSwap(action, callback);
        case ActionType.SPECIAL_ATTACK:
            return doSpecialAttack(action, callback);
        case ActionType.AUTO_ATTACK:
            // TODO! Shouldn't be an ActionType. This is a special case.
            return doAutoAttack(action.subject, callback);
        case ActionType.END_TURN:
            // Special case: do nothing at all.
            callback();
            break;
        default:
            internalError("Unknown ActionType");
            break;
    }
}

function checkMove(action, callback) {
    let theMap = findPaths(
        action.subject.getPos(),
        action.subject.speed,
    );

    // TODO also check the subject's speed.
    if (!isPathValid(theMap, action.subject, action.path, true)) {
        return failCheck("Can't move there: invalid path to target.");
    } else {
        return passCheck();
    }
}

function doMove(action, callback) {
    assert(checkMove(action).valid);

    setGlobalState(StateEnum.ANIMATING);
    highlightPath(action.path);
    let anims = [];
    for (let i = 1; i < action.path.length; i++) {
        anims.push(tweenAnimation(action.subject, function() {
            action.subject.animateTo(action.path[i], ANIM_DUR_STEP);
        }));
    }
    doAnimate(seriesAnimations(anims), callback);
}

function checkSwap(action) {
    if (action.target === null) {
        return failCheck("There's nothing there to swap with.");
    } else if (!action.target.has("Character")) {
        return failCheck("Can't swap with non-character.");
    } else if (action.target.team !== action.subject.team) {
        return failCheck("Cannot swap with other player's unit.");
    } else if (action.target === action.subject) {
        return failCheck("Cannot swap character with self.");
    } else {
        return passCheck();
    }
}

function doSwap(action, callback) {
    assert(checkSwap(action).valid);

    // Swap positions of subject and target.
    let selectPos = action.subject.getPos();
    let clickPos  = action.target.getPos();
    doAnimate(
        parallelAnimations([
            tweenAnimation(action.subject, function() {
                action.subject.animateTo(clickPos, ANIM_DUR_MOVE);
            }),
            tweenAnimation(action.target, function() {
                action.target.animateTo(selectPos, ANIM_DUR_MOVE);
            }),
        ]),
        callback
    );
}

function checkInteract(action) {
    if (action.target === null) {
        return failCheck("Nothing there to interact with.");
    } else if (!action.target.has("Interactable")) {
        return failCheck("Can't interact with that.");
    } else {
        let theMap = findPaths(
            action.subject.getPos(),
            action.subject.speed,
        );
        if (!isPathValid(theMap, action.subject, action.path, false)) {
            return failCheck("Can't interact: invalid path to target.");
        } else {
            return passCheck();
        }
    }
}

function doInteract(action, callback) {
    assert(checkInteract(action).valid);

    // Do a move-and-interact.
    assert(action.path.length > 1);
    let path = action.path.slice(0, action.path.length - 1);

    // TODO: Refactor with doMove.
    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(action.subject, function() {
            action.subject.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    // TODO some sort of animation for the interaction itself?
    doAnimate(seriesAnimations(anims), function() {
        action.target.interact(action.subject);
        callback();
    });
}

function checkAttack(action) {
    if (action.target === null) {
        return failCheck("No enemy there.");
    } else if (!action.target.has("Character")) {
        return failCheck("Can't attack non-character.");
    } else if (action.target.team === action.subject.team) {
        return failCheck("Can't attack friendly unit.");
    } else {
        let theMap = findPaths(
            action.subject.getPos(),
            action.subject.speed,
        );
        if (!isPathValid(theMap, action.subject, action.path, false)) {
            return failCheck("Can't attack: invalid path to target.");
        } else {
            return passCheck();
        }
    }
}

function doAttack(action, callback) {
    assert(checkAttack(action).valid);

    // Do a move-and-attack.
    assert(action.path.length > 1);
    let targetPos = action.path[action.path.length - 1];
    let moveToPos = action.path[action.path.length - 2];
    let path = action.path.slice(0, action.path.length - 1);

    userMessage(`${action.subject.name_} moved to ` +
        `(${moveToPos.x}, ${moveToPos.y})`);
    userMessage(`${action.subject.name_} attacked ${action.target.name_}`);

    // TODO: Refactor with doMove and doInteract.
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(action.subject, function() {
            action.subject.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }

    // Pause between move and attack, but only if we actually moved.
    if (anims.length > 0) {
        anims.push(pauseAnimation(ANIM_DUR_PAUSE_BW_MOV_ATK));
    }

    // Add the attack animation, regardless.
    let halfPos = midpoint(moveToPos, targetPos);
    anims = anims.concat([
        tweenAnimation(action.subject, function() {
            action.subject.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
        }),
        tweenAnimation(action.subject, function() {
            action.subject.animateTo(moveToPos, ANIM_DUR_HALF_ATTACK);
        }),
    ]);

    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    doAnimate(
        seriesAnimations(anims), function() {
            action.target.takeDamage(
                randInt(ATTACK_DAMAGE_MIN, ATTACK_DAMAGE_MAX)
            );
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

function doSpecialAttack(action, callback) {
    Crafty("Character").each(function() {
        if (this.team !== action.subject.team &&
                isAdjacent(action.subject.getPos(), this.getPos())) {
            this.takeDamage(randInt(SPECIAL_ATTACK_DAMAGE_MIN,
                SPECIAL_ATTACK_DAMAGE_MAX));
        }
    });
    callback();
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

function doAutoAttack(character, callback) {
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
        callback();
    } else if (getDist(theMap, characterPos, nearestTarget.getPos()) <=
               character.speed) {
        let path = getPath(
            theMap,
            character.getPos(),
            nearestTarget.getPos()
        );
        let action = attackAction(character, nearestTarget, path);
        doAction(action, callback);
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
            callback();
        } else {
            let action = moveAction(
                character,
                path.slice(0, character.speed + 1)
            );
            doAction(action, callback);
        }
    }
}

export function clearAutoActions() {
    Crafty("GridObject").each(function() {
        this.autoAction = AutoActionEnum.NONE;
    });
}


///////////////////////////////////////////////////////////////////////////////
//
//    THIS GOES IN turn_order.js
//
///////////////////////////////////////////////////////////////////////////////

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

    assert(readyCharacters.length > 0);
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
    assert(readyCharacters.length > 0);
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


///////////////////////////////////////////////////////////////////////////////
//
//    THIS GOES IN highlight.js
//
///////////////////////////////////////////////////////////////////////////////

export function highlightPath(path) {
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

