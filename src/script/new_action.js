"use strict";

const BaseAction = Object.freeze({
    // Placeholder methods to demonstrate "inheritance".
    x: function() { return 1; },
    y: function() { return 2; },
});

function actionSubclass(subObj) {
    return Object.freeze(Object.assign({}, BaseAction, subObj));
}

export const MoveAction = actionSubclass({
    // Placeholder method to demonstrate "inheritance".
    x: function() { return 10; },
});

export const MeleeAttackAction = actionSubclass({
});

export const InteractAction = actionSubclass({
});

export const SwapPlacesAction = actionSubclass({
});

export const RangedAttackAction = actionSubclass({
});

export const SpecialAttackAction = actionSubclass({
});

export const EndTurnAction = actionSubclass({
});

