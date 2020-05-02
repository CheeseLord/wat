"use strict";

import {
    ATTACK_DAMAGE_MIN,
    ATTACK_DAMAGE_MAX,
    RANGED_ATTACK_DAMAGE_MIN,
    RANGED_ATTACK_DAMAGE_MAX,
} from "./consts.js";
import {
    internalError,
} from "./message.js";
import {
    animateEndTurn,
    animateInteract,
    animateMeleeAttack,
    animateMove,
    animateRangedAttack,
    animateSpecialAttack,
    animateSwap,
    canDoAction,
    checkInteract,
    checkMeleeAttack,
    checkMove,
    checkRangedAttack,
    checkSwap,
    failCheck,
    passCheck,
    updateStateSpecialAttack,
} from "./resolve_action.js";
import {
    randInt,
} from "./util.js";

///////////////////////////////////////////////////////////////////////////////
// Base Action type

const BaseAction = Object.freeze({
    name:         "BaseAction",
    isActionType: true,

    ////////////////
    // Public API

    init: function() {
        this.mustOverride("init");
    },

    check: function(action) {
        this.mustOverride("check");
    },

    doit: function(action, callback) {
        this.checkActionType(action);
        if (!this.check(action).valid) {
            // Callers are supposed to prevent this from happening, so if we
            // get here it indicates a bug in the code. In the interest of both
            // debugging and continuing somewhat gracefully:
            //   - Report an internal error, so we can catch and fix the bug.
            //   - Skip this action, so neither users nor AI can use such a bug
            //     to cheat.
            //   - End the current character's turn, so that if this is an AI
            //     move we don't go into an infinite loop of trying and failing
            //     the same invalid action over and over again.
            internalError("Invalid action.");
            action.subject.actionPoints = 0;
            callback();
            return;
        }
        this.resolve(action);
        action.subject.actionPoints -= this.actionPointCost(action);
        // The anonymous function passed to this.animate() will not be called
        // in the context of this, but must still reference 'this' in order to
        // call this.updateState(). We can't simply close over 'this', because
        // (I guess) it's reset to undefined when the function is called not
        // from the context of any object. We also can't close over just a
        // reference to this.updateState, because then when we call it inside
        // the anonymous function it won't be in the context of this object,
        // meaning that any references to 'this' in updateState will fail.
        // Instead, create a local reference to 'this' under a different name,
        // then close over that.
        let outerThis = this;
        this.animate(action, function() {
            outerThis.updateState(action);
            callback();
        });
    },

    actionPointCost: function(action) {
        this.mustOverride("actionPointCost");
    },

    ////////////////
    // Internal helpers, specific to action type

    // Default resolve is blank, because lots of actions don't need it.
    resolve: function(action) { },

    // Ditto updateState, because in a few cases state update is handled by the
    // animation itself.
    updateState: function(action) { },

    // animate must be overridden. I only know of one case where it
    // intentionally should be empty (EndTurnAction); all other missing
    // animations should be filled in.
    // TODO: Make sure the global state gets reset after animations.
    animate: function(action) {
        this.mustOverride("animate");
    },

    ////////////////
    // Common helpers called by subclasses -- don't override these

    // Helpers used by implementations of real methods

    commonCheck: function(action, checkFunc) {
        this.checkActionType(action);
        if (!canDoAction(action.subject, action.type)) {
            return failCheck("That character can't do that.");
        } else if (action.subject.actionPoints <
                action.type.actionPointCost(action)) {
            return failCheck("Not enough action points.");
        } else {
            return checkFunc(action);
        }
    },

    // Sanity checks

    mustOverride: function(methodName) {
        internalError(`${this.name} does not override method ${methodName} ` +
            `of BaseAction`);
    },

    checkActionType: function(action) {
        if (action.type !== this) {
            internalError(`Method of ${this.name} called on action of type ` +
                `${action.type.name}`);
        }
    },
});

function actionSubclass(subObj) {
    return Object.freeze(Object.assign({}, BaseAction, subObj));
}

///////////////////////////////////////////////////////////////////////////////
// MoveAction

export const MoveAction = actionSubclass({
    name: "MoveAction",

    init: function(subject, path) {
        return {
            type:    this,
            subject: subject,
            path:    path,
        };
    },

    check: function(action) {
        return this.commonCheck(action, checkMove);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 1;
    },

    // State change handled by Crafty's animation

    animate: animateMove,
});

///////////////////////////////////////////////////////////////////////////////
// SwapPlacesAction

export const SwapPlacesAction = actionSubclass({
    name: "SwapPlacesAction",

    init: function(subject, target, path) {
        return actionWithTarget(this, subject, target);
    },

    check: function(action) {
        return this.commonCheck(action, checkSwap);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 2;
    },

    // State change handled by Crafty's animation

    animate: animateSwap,
});

///////////////////////////////////////////////////////////////////////////////
// MeleeAttackAction

export const MeleeAttackAction = actionSubclass({
    name: "MeleeAttackAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },

    check: function(action) {
        return this.commonCheck(action, checkMeleeAttack);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 2;
    },

    resolve: function(action) {
        action.damage = randInt(ATTACK_DAMAGE_MIN, ATTACK_DAMAGE_MAX);
    },

    updateState: function(action) {
        this.checkActionType(action);
        // TODO: This should read damage from resolved action.
        action.target.takeDamage(action.damage);
    },

    animate: animateMeleeAttack,
});

///////////////////////////////////////////////////////////////////////////////
// RangedAttackAction

export const RangedAttackAction = actionSubclass({
    name: "RangedAttackAction",

    init: function(subject, target, path) {
        return actionWithTarget(this, subject, target);
    },

    check: function(action) {
        return this.commonCheck(action, checkRangedAttack);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 2;
    },

    resolve: function(action) {
        action.damage = randInt(
            RANGED_ATTACK_DAMAGE_MIN,
            RANGED_ATTACK_DAMAGE_MAX,
        );
    },

    updateState: function(action) {
        this.checkActionType(action);
        // TODO: This should read damage from resolved action.
        action.target.takeDamage(action.damage);
    },

    animate: animateRangedAttack,
});

///////////////////////////////////////////////////////////////////////////////
// SpecialAttackAction

export const SpecialAttackAction = actionSubclass({
    name: "SpecialAttackAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },

    check: function(action) {
        return this.commonCheck(action, (_) => { return passCheck(); });
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 3;
    },

    updateState: updateStateSpecialAttack,

    animate: animateSpecialAttack,
});

///////////////////////////////////////////////////////////////////////////////
// InteractAction

export const InteractAction = actionSubclass({
    name: "InteractAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },

    check: function(action) {
        return this.commonCheck(action, checkInteract);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 1;
    },

    updateState: function(action) {
        this.checkActionType(action);
        action.target.interact(action.subject);
    },

    animate: animateInteract,
});

///////////////////////////////////////////////////////////////////////////////
// EndTurnAction

export const EndTurnAction = actionSubclass({
    name: "EndTurnAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },

    check: function(action) {
        return this.commonCheck(action, (_) => { return passCheck(); });
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return action.subject.actionPoints;
    },

    // No updateState because there's no state change.

    animate: animateEndTurn,
});

///////////////////////////////////////////////////////////////////////////////
// Helpers - factory functions

function actionWithTarget(type, subject, target) {
    return {
        type:    type,
        subject: subject,
        target:  target,
    };
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
// Helpers - other

function pathApExclTarget(path) {
    // Minus 1 for the start cell, minus 1 for the target cell.
    // TODO: Exclude target from path for MeleeAttackAction and InteractAction,
    // so that everyone can just use action.path.length - 1? (Which matches
    // getPathLength.)
    return path.length - 2;
}

///////////////////////////////////////////////////////////////////////////////
// FIXME: For backward compatibility with action_type.js. Delete these.

export const ActionType = Object.freeze({
    MOVE:           MoveAction,
    ATTACK:         MeleeAttackAction,
    INTERACT:       InteractAction,
    SWAP_PLACES:    SwapPlacesAction,
    RANGED_ATTACK:  RangedAttackAction,
    SPECIAL_ATTACK: SpecialAttackAction,
    END_TURN:       EndTurnAction,
});

