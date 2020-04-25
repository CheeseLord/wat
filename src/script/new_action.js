"use strict";

import {
    assert,
    internalError,
} from "./message.js";

///////////////////////////////////////////////////////////////////////////////
// Base Action type

const BaseAction = Object.freeze({
    name:         "BaseAction",
    isActionType: true,

    mustOverride: function(methodName) {
        internalError(`${this.name} does not override method ${methodName} ` +
            `of BaseAction`);
    },

    init: function() {
        this.mustOverride("init");
    },

    // TODO: Actually override these

    check: function(action) {
        this.mustOverride("check");
    },

    doStateUpdate: function(action) {
        this.mustOverride("doStateUpdate");
    },

    doAnimate: function(action) {
        this.mustOverride("doAnimate");
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
});

///////////////////////////////////////////////////////////////////////////////
// MeleeAttackAction

export const MeleeAttackAction = actionSubclass({
    name: "MeleeAttackAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },
});

///////////////////////////////////////////////////////////////////////////////
// InteractAction

export const InteractAction = actionSubclass({
    name: "InteractAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },
});

///////////////////////////////////////////////////////////////////////////////
// SwapPlacesAction

export const SwapPlacesAction = actionSubclass({
    name: "SwapPlacesAction",

    init: function(subject, target, path) {
        return actionWithTarget(this, subject, target);
    },
});

///////////////////////////////////////////////////////////////////////////////
// RangedAttackAction

export const RangedAttackAction = actionSubclass({
    name: "RangedAttackAction",

    init: function(subject, target, path) {
        return actionWithTarget(this, subject, target);
    },
});

///////////////////////////////////////////////////////////////////////////////
// SpecialAttackAction

export const SpecialAttackAction = actionSubclass({
    name: "SpecialAttackAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },
});

///////////////////////////////////////////////////////////////////////////////
// EndTurnAction

export const EndTurnAction = actionSubclass({
    name: "EndTurnAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },
});

///////////////////////////////////////////////////////////////////////////////
// Helpers for various .init() methods.

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

export function moveAction(subject, path) {
    return MoveAction.init(subject, path);
}

export function attackAction(subject, target, path) {
    return MeleeAttackAction.init(subject, target, path);
}

export function interactAction(subject, target, path) {
    return InteractAction.init(subject, target, path);
}

export function swapPlacesAction(subject, target) {
    return SwapPlacesAction.init(subject, target);
}

export function rangedAttackAction(subject, target) {
    return RangedAttackAction.init(subject, target);
}

export function specialAttackAction(subject) {
    return SpecialAttackAction.init(subject);
}

export function endTurnAction(subject) {
    return EndTurnAction.init(subject);
}

export function isValidActionType(actionType) {
    // Replace (true|undefined) with (true|false).
    return !!actionType.isActionType;
}

// FIXME: Member function

export function getActionPointCost(action) {
    if (action.type === ActionType.MOVE) {
        // Path includes start point.
        assert(action.path.length >= 1);
        return action.path.length - 1;
    } else if (action.type === ActionType.ATTACK) {
        // Path includes start point and target.
        assert(action.path.length >= 1);
        let moveCost = action.path.length - 2;
        let attackCost = 2;
        return moveCost + attackCost;
    } else if (action.type === ActionType.INTERACT) {
        // Path includes start point and target.
        assert(action.path.length >= 1);
        let moveCost = action.path.length - 2;
        let interactCost = 1;
        return moveCost + interactCost;
    } else if (action.type === ActionType.SWAP_PLACES) {
        return 2;
    } else if (action.type === ActionType.RANGED_ATTACK) {
        return 2;
    } else if (action.type === ActionType.SPECIAL_ATTACK) {
        return 3;
    } else if (action.type === ActionType.END_TURN) {
        return action.subject.actionPoints;
    } else {
        internalError("Unknown ActionType");
        return Infinity;
    }
}

