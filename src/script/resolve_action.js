/* global Crafty */

"use strict";

import {
    MeleeAttackAction,
    InteractAction,
    MoveAction,
} from "./new_action.js";
import {
    doAnimate,
    parallelAnimations,
    pauseAnimation,
    seriesAnimations,
    synchronousAnimation,
    tweenAnimation,
} from "./animation.js";
import {
    ANIM_DUR_DMG_NUM_FADE_IN,
    ANIM_DUR_DMG_NUM_FADE_OUT,
    ANIM_DUR_HALF_ATTACK,
    ANIM_DUR_MOVE,
    ANIM_DUR_PAUSE_BW_MOV_ATK,
    ANIM_DUR_RANGED_SHOT,
    ANIM_DUR_STEP,
    RANGED_ATTACK_RANGE,
    SPECIAL_ATTACK_DAMAGE_MIN,
    SPECIAL_ATTACK_DAMAGE_MAX,
    StateEnum,
    Z_PARTICLE,
    Z_WORLD_UI,
} from "./consts.js";
import {
    findPaths,
    getPath,
    isAdjacent,
    isPathValid,
    midpoint,
    getDistance,
} from "./geometry.js";
import {
    highlightPath,
} from "./highlight.js";
import {
    assert,
    userMessage,
} from "./message.js";
import {
    randInt,
} from "./util.js";

// In JavaScript, if you import a variable and then assign a new value to it,
// other modules don't see the new value. Therefore, instead of allowing other
// modules import globalState directly, have them access it through
// {get,set}GlobalState.
// TODO [#36]: What the heck is globalState, and why is it in action.js?
var globalState = StateEnum.DEFAULT;
export function getGlobalState() { return globalState; }
export function setGlobalState(newState) { globalState = newState; }

///////////////////////////////////////////////////////////////////////////////
// Action handlers

export function canDoAction(character, actionType) {
    return (actionType.isAlwaysAvailable() ||
            character.availableActions.includes(actionType));
}

export function animateMove(action, callback) {
    setGlobalState(StateEnum.ANIMATING);
    let anims = seriesAnimations([]);

    let path = action.path;
    highlightPath(path);

    anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(action.subject, function() {
            action.subject.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    anims = seriesAnimations(anims);

    doAnimate(anims, callback);
}

export function animateSwap(action, callback) {
    setGlobalState(StateEnum.ANIMATING);
    let anims = seriesAnimations([]);

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

    doAnimate(anims, callback);
}

export function animateMeleeAttack(action, callback) {
    setGlobalState(StateEnum.ANIMATING);
    let anims = seriesAnimations([]);

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

    // Add the attack animation, regardless.
    let halfPos = midpoint(moveToPos, targetPos);

    anims = anims.concat([
        tweenAnimation(action.subject, function() {
            action.subject.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
        }),
        parallelAnimations([
            tweenAnimation(action.subject, function() {
                action.subject.animateTo(moveToPos, ANIM_DUR_HALF_ATTACK);
            }),
            takeDamageAnim(action.target, action.damage),
        ]),
    ]);

    anims = seriesAnimations(anims);

    doAnimate(anims, callback);
}

export function animateRangedAttack(action, callback) {
    setGlobalState(StateEnum.ANIMATING);
    let anims = seriesAnimations([]);

    let bullet = Crafty.e("2D, DOM, bullet_anim, Tween")
            .attr({
                x: action.subject.x,
                y: action.subject.y,
                z: Z_PARTICLE,
            });
    // TODO: The duration for this tween should be dependent on the
    // distance. Have a bullet speed, not a fixed bullet duration.
    anims = seriesAnimations([
        tweenAnimation(bullet, function() {
            bullet.tween({
                x: action.target.x,
                y: action.target.y,
            }, ANIM_DUR_RANGED_SHOT);
        }),
        synchronousAnimation(function() {
            bullet.destroy();
        }),
        takeDamageAnim(action.target, action.damage),
    ]);

    doAnimate(anims, callback);
}

export function animateSpecialAttack(action, callback) {
    setGlobalState(StateEnum.ANIMATING);
    let anims = seriesAnimations([]);

    // TODO: Actually animate special attacks

    doAnimate(anims, callback);
}

export function animateInteract(action, callback) {
    setGlobalState(StateEnum.ANIMATING);
    let anims = seriesAnimations([]);

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

    doAnimate(anims, callback);
}

export function animateEndTurn(action, callback) {
    // Intentionally no animation.
    setGlobalState(StateEnum.ANIMATING);
    callback();
}

function takeDamageAnim(target, damage) {
    // Note: we could probably create this object in a synchronousAnimation to
    // avoid having to pre-create it as fully transparent. If we want it to
    // fade in anyway, though, it doesn't matter.
    let damageText = Crafty.e("2D, DOM, Text, Tween")
            .attr({
                x:     target.x,
                y:     target.y,
                z:     Z_WORLD_UI + 2,  // TODO: Make this less awful.
                alpha: 0.00,
            })
            .textColor("rgba(255, 0, 0)")
            .textAlign("center")
            .textFont({size: "30px"})
            .text("" + damage);

    let textAnim = seriesAnimations([
        tweenAnimation(damageText, function() {
            damageText.tween(
                {
                    alpha: 1.0,
                    y:     target.y - 30,
                },
                ANIM_DUR_DMG_NUM_FADE_IN,
            );
        }),
        tweenAnimation(damageText, function() {
            damageText.tween(
                {
                    alpha: 0.0,
                },
                ANIM_DUR_DMG_NUM_FADE_OUT,
            );
        }),
        synchronousAnimation(function() {
            damageText.destroy();
        }),
    ]);

    return textAnim;
}

// Put this function in resolve_action.js because it's nontrivial. I couldn't
// bring myself to out-of-line all of the one-line updateStates for other
// actions.
// TODO: Would still be nice to be consistent.
export function updateStateSpecialAttack(action) {
    // TODO: Handle the damage in resolveAction.
    Crafty("Character").each(function() {
        if (this.team !== action.subject.team &&
                isAdjacent(action.subject.getPos(), this.getPos())) {
            this.takeDamage(randInt(SPECIAL_ATTACK_DAMAGE_MIN,
                SPECIAL_ATTACK_DAMAGE_MAX));
        }
    });
}

export function checkMove(action, callback) {
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

export function checkSwap(action) {
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

export function checkInteract(action) {
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

export function checkMeleeAttack(action) {
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

export function checkRangedAttack(action) {
    if (action.target === null) {
        return failCheck("No enemy there.");
    } else if (!action.target.has("Character")) {
        return failCheck("Can't attack non-character.");
    } else if (action.target.team === action.subject.team) {
        return failCheck("Can't attack friendly unit.");
    } else {
        let dist = getDistance(
            action.subject.getPos(),
            action.target.getPos(),
        );
        if (dist > RANGED_ATTACK_RANGE) {
            return failCheck("Enemy too far away.");
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
export function passCheck() {
    return {valid: true};
}
export function failCheck(reason) {
    return {valid: false, reason: reason};
}

///////////////////////////////////////////////////////////////////////////////
// AutoAction stuff
//
// TODO: Probably also doesn't belong in this file.

export function updateAutoActions(subject) {
    let subjectPos = subject.getPos();
    let theMap = findPaths(subjectPos, subject.actionPoints);
    Crafty("GridObject").each(function() {
        let target = this;
        this.autoAction = null;
        let path = getPath(theMap, subjectPos, target.getPos());
        if (path === null) {
            return;
        } else if (path.length <= 1) {
            // Don't set auto-actions on your own cell, since clicking on your
            // own cell is intercepted by the player UI.
            return;
        }
        // TODO: Make a list and loop over it. Store the ActionDesc instead of
        // a separate AutoActionEnum value, and then reuse that ActionDesc for
        // highlighting and resolving the action.
        let tryActions = [
            InteractAction.init(subject, target, path),
            MeleeAttackAction.init(subject, target, path),
            MoveAction.init(subject, path),
        ];
        for (let i = 0; i < tryActions.length; i++) {
            if (tryActions[i].type.check(tryActions[i]).valid) {
                this.autoAction = tryActions[i];
                break;
            }
        }
        // If none were valid, we already set autoAction to null above.
    });
}

export function clearAutoActions() {
    Crafty("GridObject").each(function() {
        this.autoAction = null;
    });
}

