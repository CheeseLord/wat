"use strict";

import {
    internalError,
} from "./message.js";
import {
    canDoAction,
    checkAttack,
    checkInteract,
    checkMove,
    checkRangedAttack,
    checkSwap,
    failCheck,
    passCheck,
} from "./resolve_action.js";

///////////////////////////////////////////////////////////////////////////////
// Base Action type

const BaseAction = Object.freeze({
    name:         "BaseAction",
    isActionType: true,

    init: function() {
        this.mustOverride("init");
    },

    // TODO: Actually override and use these next 3

    check: function(action) {
        this.mustOverride("check");
    },

    doStateUpdate: function(action) {
        this.mustOverride("doStateUpdate");
    },

    doAnimate: function(action) {
        this.mustOverride("doAnimate");
    },

    actionPointCost: function(action) {
        this.mustOverride("actionPointCost");
    },

    ////////////////
    // Common helpers; don't override these.

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
});

///////////////////////////////////////////////////////////////////////////////
// MeleeAttackAction

export const MeleeAttackAction = actionSubclass({
    name: "MeleeAttackAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },

    check: function(action) {
        // TODO: s/checkAttack/checkMeleeAttack/g
        return this.commonCheck(action, checkAttack);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 2;
    },
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
});

///////////////////////////////////////////////////////////////////////////////
// SpecialAttackAction

export const SpecialAttackAction = actionSubclass({
    name: "SpecialAttackAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },

    check: function(action) {
        return this.commonCheck(action, (_) => { passCheck(); });
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 3;
    },
});

///////////////////////////////////////////////////////////////////////////////
// EndTurnAction

export const EndTurnAction = actionSubclass({
    name: "EndTurnAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },

    check: function(action) {
        return this.commonCheck(action, (_) => { passCheck(); });
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return action.subject.actionPoints;
    },
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

