"use strict";

import {
    internalError,
} from "./message.js";

///////////////////////////////////////////////////////////////////////////////
// Base Action type

const BaseAction = Object.freeze({
    name: "BaseAction",

    mustOverride: function(methodName) {
        internalError(`${this.name} does not override method ${methodName} ` +
            `of BaseAction`);
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
});

///////////////////////////////////////////////////////////////////////////////
// MeleeAttackAction

export const MeleeAttackAction = actionSubclass({
    name: "MeleeAttackAction",
});

///////////////////////////////////////////////////////////////////////////////
// InteractAction

export const InteractAction = actionSubclass({
    name: "InteractAction",
});

///////////////////////////////////////////////////////////////////////////////
// SwapPlacesAction

export const SwapPlacesAction = actionSubclass({
    name: "SwapPlacesAction",
});

///////////////////////////////////////////////////////////////////////////////
// RangedAttackAction

export const RangedAttackAction = actionSubclass({
    name: "RangedAttackAction",
});

///////////////////////////////////////////////////////////////////////////////
// SpecialAttackAction

export const SpecialAttackAction = actionSubclass({
    name: "SpecialAttackAction",
});

///////////////////////////////////////////////////////////////////////////////
// EndTurnAction

export const EndTurnAction = actionSubclass({
    name: "EndTurnAction",
});

