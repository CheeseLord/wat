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
    StateEnum,
    Z_WORLD_UI,
} from "./consts.js";
import {
    findPaths,
    getPath,
    isAdjacent,
    isPathValid,
    midpoint,
    getDist,
} from "./geometry.js";
import {
    highlightPath,
} from "./highlight.js";
import {
    assert,
    internalError,
    userMessage,
} from "./message.js";
import {
    randInt,
} from "./util.js";

// In JavaScript, if you import a variable and then assign a new value to it,
// other modules don't see the new value. Therefore, instead of allowing other
// modules import globalState directly, have them access it through
// {get,set}GlobalState.
var globalState = StateEnum.DEFAULT;
export function getGlobalState() { return globalState; }
export function setGlobalState(newState) { globalState = newState; }

///////////////////////////////////////////////////////////////////////////////
// "Janky class" ActionDesc -- describes an action that will be taken.
// Type identified by the 'type' field, a member of ActionType.
// Other fields based on type, see factory functions below.

export const ActionType = Object.freeze({
    MOVE:           "MOVE",
    ATTACK:         "ATTACK",
    INTERACT:       "INTERACT",
    SWAP_PLACES:    "SWAP_PLACES",
    SPECIAL_ATTACK: "SPECIAL_ATTACK",
    END_TURN:       "END_TURN",
});

function isValidActionType(actionType) {
    return ActionType.hasOwnProperty(actionType);
}

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

export function endTurnAction(subject) {
    return nullaryAction(ActionType.END_TURN, subject);
}

// Note: path includes the target. These actions consist of moving to path[-2]
// and then interacting with the target, which is presumably at path[-1].
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
// Action-related queries

function getActionPointCost(action) {
    switch (action.type) {
        case ActionType.MOVE:
        case ActionType.ATTACK:
        case ActionType.INTERACT:
            // Path length must at least include starting point
            assert(action.path.length >= 1);
            let cost = action.path.length - 1;
            // For move, action.path.length - 1 is the number of squares of
            // movement, which equals the AP cost, so we're done.
            // For interact/attack, it's one more than the number of squares of
            // movement because it includes the target. So currently cost is 1
            // per square of movement plus 1 for the final action.
            // For (move-and-)attack, add 1 because the attack itself costs 2.
            if (action.type === ActionType.ATTACK) {
                cost += 1;
            }
            return cost;
        case ActionType.SWAP_PLACES:
            return 2;
        case ActionType.SPECIAL_ATTACK:
            return 3;
        case ActionType.END_TURN:
            return action.subject.actionPoints;
        default:
            internalError("Unknown ActionType");
            return Infinity;
    }
}

///////////////////////////////////////////////////////////////////////////////
// Action handlers

export function checkAction(action) {
    if (action.subject.actionPoints < getActionPointCost(action)) {
        return failCheck("Not enough action points");
    }
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
        case ActionType.END_TURN:
            return passCheck();
        default:
            internalError("Unknown ActionType");
            return failCheck("An internal error occurred.");
    }
}

export function doAction(action, callback) {
    assert(isValidActionType(action.type));
    assert(checkAction(action).valid);

    // TODO: Details should be handled in a resolvedAction type, and we
    // should call a resolveAction functionhere.
    if (action.type === ActionType.ATTACK) {
        action.damage = randInt(ATTACK_DAMAGE_MIN, ATTACK_DAMAGE_MAX);
    }

    doActionAnimation(action, function() {
        updateState(action);
        callback();
    });
}

function doActionAnimation(action, callback) {
    setGlobalState(StateEnum.ANIMATING);

    let anims = seriesAnimations([]);
    let cleanupCallback = callback;

    if (action.type === ActionType.MOVE) {
        let path = action.path;
        highlightPath(path);

        anims = [];
        for (let i = 1; i < path.length; i++) {
            anims.push(tweenAnimation(action.subject, function() {
                action.subject.animateTo(path[i], ANIM_DUR_STEP);
            }));
        }
        anims = seriesAnimations(anims);
    } else if (action.type === ActionType.ATTACK) {
        assert(action.path.length > 1);
        let targetPos = action.path[action.path.length - 1];
        let moveToPos = action.path[action.path.length - 2];
        let path = action.path.slice(0, action.path.length - 1);
        highlightPath(path);

        // Tell the user what happened.
        userMessage(
            `${action.subject.name_} moved to ` +
            `(${moveToPos.x}, ${moveToPos.y})`
        );
        userMessage(
            `${action.subject.name_} attacked ${action.target.name_}`
        );

        anims = [];

        // Move up to the target.
        for (let i = 1; i < path.length; i++) {
            anims.push(tweenAnimation(action.subject, function() {
                action.subject.animateTo(path[i], ANIM_DUR_STEP);
            }));
        }

        // Pause between move and attack, but only if we actually moved.
        if (anims.length > 0) {
            anims.push(pauseAnimation(ANIM_DUR_PAUSE_BW_MOV_ATK));
        }

        let damageText = Crafty.e("2D, DOM, Text, Tween")
                .attr({
                    x:     action.target.x,
                    y:     action.target.y,
                    z:     Z_WORLD_UI + 2,  // TODO: Make this less awful.
                    alpha: 0.00,
                })
                .textColor("rgba(255, 0, 0)")
                .textAlign("center")
                .textFont({size: "30px"})
                .text("" + action.damage);

        // Add the attack animation, regardless.
        let halfPos = midpoint(moveToPos, targetPos);
        anims = anims.concat([
            tweenAnimation(action.subject, function() {
                action.subject.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
            }),
            tweenAnimation(action.subject, function() {
                action.subject.animateTo(moveToPos, ANIM_DUR_HALF_ATTACK);
            }),
            tweenAnimation(damageText, function() {
                damageText.tween(
                    {
                        alpha: 1.0,
                        y:     action.target.y - 30,
                    },
                    ANIM_DUR_STEP,
                );
            }),
            tweenAnimation(damageText, function() {
                damageText.tween(
                    {
                        alpha: 0.0,
                    },
                    ANIM_DUR_STEP * 3,
                );
            }),
        ]);

        anims = seriesAnimations(anims);
        cleanupCallback = function() {
            damageText.destroy();
            callback();
        };
    } else if (action.type === ActionType.SWAP_PLACES) {
        // Swap positions of subject and target.
        let selectPos = action.subject.getPos();
        let clickPos  = action.target.getPos();
        anims = parallelAnimations([
            tweenAnimation(action.subject, function() {
                action.subject.animateTo(clickPos, ANIM_DUR_MOVE);
            }),
            tweenAnimation(action.target, function() {
                action.target.animateTo(selectPos, ANIM_DUR_MOVE);
            }),
        ]);
    } else if (action.type === ActionType.INTERACT) {
        assert(action.path.length > 0);
        let path = action.path.slice(0, action.path.length - 1);
        highlightPath(path);

        anims = [];
        for (let i = 1; i < path.length; i++) {
            anims.push(tweenAnimation(action.subject, function() {
                action.subject.animateTo(path[i], ANIM_DUR_STEP);
            }));
        }

        anims = seriesAnimations(anims);
    } else if (action.type === ActionType.SPECIAL_ATTACK) {
        // No animation.
    } else if (action.type === ActionType.END_TURN) {
        // No animation.
    } else {
        internalError(`Invalid action type: ${action.type}`);
    }

    doAnimate(anims, cleanupCallback);

    // TODO: Make sure the global state gets reset.
}

function updateState(action) {
    action.subject.actionPoints -= getActionPointCost(action);

    if (action.type === ActionType.MOVE) {
        // State change handle by Crafty's animation.
    } else if (action.type === ActionType.ATTACK) {
        // TODO: This should read damage from resolved action.
        action.target.takeDamage(action.damage);
    } else if (action.type === ActionType.SWAP_PLACES) {
        // State change handle by Crafty's animation.
    } else if (action.type === ActionType.INTERACT) {
        action.target.interact(action.subject);
    } else if (action.type === ActionType.SPECIAL_ATTACK) {
        // TODO: Handle the damage in resolveAction.
        Crafty("Character").each(function() {
            if (this.team !== action.subject.team &&
                    isAdjacent(action.subject.getPos(), this.getPos())) {
                this.takeDamage(randInt(SPECIAL_ATTACK_DAMAGE_MIN,
                    SPECIAL_ATTACK_DAMAGE_MAX));
            }
        });
    } else if (action.type === ActionType.END_TURN) {
        // No state change.
    } else {
        internalError(`Invalid action type: ${action.type}`);
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

export function updateAutoActions(subject) {
    let subjectPos = subject.getPos();
    let theMap = findPaths(subjectPos, subject.actionPoints);
    Crafty("GridObject").each(function() {
        let target = this;
        let path = getPath(theMap, subjectPos, target.getPos());
        if (path === null) {
            this.autoAction = AutoActionEnum.NONE;
            return;
        }
        // TODO: Make a list and loop over it. Store the ActionDesc instead of
        // a separate AutoActionEnum value, and then reuse that ActionDesc for
        // highlighting and resolving the action.
        let action1 = interactAction(subject, target, path);
        let action2 = attackAction(subject, target, path);
        let action3 = moveAction(subject, path);
        if (checkAction(action1).valid) {
            this.autoAction = AutoActionEnum.INTERACT;
        } else if (checkAction(action2).valid) {
            this.autoAction = AutoActionEnum.ATTACK;
        } else if (checkAction(action3).valid) {
            this.autoAction = AutoActionEnum.MOVE;
        } else {
            this.autoAction = AutoActionEnum.NONE;
        }
    });
}

///////////////////////////////////////////////////////////////////////////////
// TODO: Move this section to ai.js
//
// Will need to resolve cyclic imports.
//   - Probably want to split action.js in two:
//       - Definitions of action types (pure data, no imports)
//       - Everything else
//     Is that enough?

export function chooseAiAction(character) {
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
        return endTurnAction(character);
    } else if (getDist(theMap, characterPos, nearestTarget.getPos()) <=
               character.speed) {
        let path = getPath(
            theMap,
            character.getPos(),
            nearestTarget.getPos()
        );
        return attackAction(character, nearestTarget, path);
    } else {
        let path = getPath(
            theMap,
            character.getPos(),
            nearestTarget.getPos()
        );
        let target = null;
        let x = path[character.speed].x;
        let y = path[character.speed].y;
        // FIXME: Don't reference "Ground" by name.
        Crafty("Ground").each(function() {
            if (this.getPos().x === x && this.getPos().y === y) {
                target = this;
            }
        });
        if (target === null) {
            return endTurnAction(character);
        } else {
            return moveAction(character, path.slice(0, character.speed + 1));
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

export function clearAutoActions() {
    Crafty("GridObject").each(function() {
        this.autoAction = AutoActionEnum.NONE;
    });
}

