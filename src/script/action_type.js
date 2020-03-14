"use strict";

import {
    assert,
    internalError,
} from "./message.js";

///////////////////////////////////////////////////////////////////////////////
// "Janky class" ActionDesc -- describes an action that will be taken.
// Type identified by the 'type' field, a member of ActionType.
// Other fields based on type, see factory functions below.

export const ActionType = Object.freeze({
    MOVE:           "MOVE",
    ATTACK:         "ATTACK",
    INTERACT:       "INTERACT",
    SWAP_PLACES:    "SWAP_PLACES",
    RANGED_ATTACK:  "RANGED_ATTACK",
    SPECIAL_ATTACK: "SPECIAL_ATTACK",
    END_TURN:       "END_TURN",
});

export function isValidActionType(actionType) {
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
    return actionWithTarget(ActionType.SWAP_PLACES, subject, target);
}

export function rangedAttackAction(subject, target) {
    return actionWithTarget(ActionType.RANGED_ATTACK, subject, target);
}

export function specialAttackAction(subject) {
    return nullaryAction(ActionType.SPECIAL_ATTACK, subject);
}

export function endTurnAction(subject) {
    return nullaryAction(ActionType.END_TURN, subject);
}

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
// Action-related queries

export function getActionPointCost(action) {
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
        case ActionType.RANGED_ATTACK:
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

