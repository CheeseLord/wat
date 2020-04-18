/* global Crafty */

"use strict";

import {StateEnum} from "./consts.js";

import {
    ActionType,
    endTurnAction,
    specialAttackAction,
} from "./action_type.js";
// TODO: We'll need this if we re-add the "Auto Attack" button.
// import {
//     chooseAiAction,
// } from  "./ai.js";
import {
    debugLog,
    internalError,
} from "./message.js";
import {
    doAction,
    setGlobalState,
} from  "./resolve_action.js";
import {
    afterPlayerMove,
    deselectCharacter,
    // TODO: Does this work??
    selectedCharacter,
} from "./turn_order.js";

///////////////////////////////////////////////////////////////////////////////
// Temporary placeholder stuff for eventual dynamic menu building.

const ACTION_TYPE_TREE = {
    action:   false,
    name:     "Select Action",
    state:    StateEnum.CHARACTER_SELECTED,
    children: [
        {
            action: true,
            name:   "Move",
            type:   ActionType.MOVE,
        },
        {
            action: true,
            name:   "Swap Places",
            type:   ActionType.SWAP_PLACES,
        },
        {
            action:   false,
            name:     "Attack",
            state:    StateEnum.CHARACTER_ATTACK,
            children: [
                {
                    action: true,
                    name:   "Melee Attack",
                    type:   ActionType.ATTACK,
                },
                {
                    action: true,
                    name:   "Ranged Attack",
                    type:   ActionType.RANGED_ATTACK,
                },
                {
                    action: true,
                    name:   "Special Attack",
                    type:   ActionType.SPECIAL_ATTACK,
                },
            ],
        },
        {
            action: true,
            name:   "Interact",
            type:   ActionType.INTERACT,
        },
        // TODO: Custom entry for this button we used to have:
        //   ["Auto Attack", CLEAR_MENU, () => {
        //       doAction(chooseAiAction(selectedCharacter), afterPlayerMove);
        //   }],
        {
            action: true,
            name:   "End Turn",
            type:   ActionType.END_TURN,
        },
    ],
};

// TODO move these functions somewhere better

// TODO [#36]: Rework globalState
function getStateFromAction(actionType) {
    // TODO [#35]: Replace switch statements with dynamic dispatch.
    switch (actionType) {
        case ActionType.MOVE:
            return StateEnum.CHARACTER_MOVE;
        case ActionType.ATTACK:
            return StateEnum.CHARACTER_ATTACK;
        case ActionType.INTERACT:
            return StateEnum.CHARACTER_INTERACT;
        case ActionType.SWAP_PLACES:
            return StateEnum.CHARACTER_SWAP;
        case ActionType.RANGED_ATTACK:
            return StateEnum.CHARACTER_RANGED_ATTACK;
        case ActionType.SPECIAL_ATTACK:
        case ActionType.END_TURN:
            internalError("No state for this action type");
            return StateEnum.DEFAULT;
        default:
            internalError("Unknown ActionType");
            return StateEnum.DEFAULT;
    }
}

function doesActionNeedTarget(actionType) {
    // TODO [#35]: Replace switch statements with dynamic dispatch.
    switch (actionType) {
        case ActionType.MOVE:
        case ActionType.ATTACK:
        case ActionType.INTERACT:
        case ActionType.SWAP_PLACES:
        case ActionType.RANGED_ATTACK:
            return true;
        case ActionType.SPECIAL_ATTACK:
        case ActionType.END_TURN:
            return false;
        default:
            internalError("Unknown ActionType");
            return false;
    }
}

function makeUntargetedAction(actionType) {
    // TODO [#35]: Replace switch statements with dynamic dispatch.
    switch (actionType) {
        case ActionType.SPECIAL_ATTACK:
            return specialAttackAction(selectedCharacter);
        case ActionType.END_TURN:
            return endTurnAction(selectedCharacter);
        case ActionType.MOVE:
        case ActionType.ATTACK:
        case ActionType.INTERACT:
        case ActionType.SWAP_PLACES:
        case ActionType.RANGED_ATTACK:
            internalError("makeUntargetedAction() of targeted ActionType");
            return endTurnAction(selectedCharacter);
        default:
            internalError("Unknown ActionType");
            return endTurnAction(selectedCharacter);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Menu table handling

const CLEAR_MENU  = {};
const PARENT_MENU = {};

const clearMenuState = StateEnum.DEFAULT;

// menuStack - list of menus that would be transitioned to if you click a
//     "back" button. Does not include the current menu.
// currMenuName - the menuDesc of the currently-displayed menu, or null if
//     there is no menu displayed.
var menuStack    = [];
var currMenuDesc = null;

function doNothing() {}

export function getTopMenu() {
    return buildOneMenuNode(ACTION_TYPE_TREE, /* isTop = */true);
}

function buildOneMenuNode(actionTypeSubtree, isTop) {
    if (actionTypeSubtree.action) {
        // .action, .name, .type
        if (doesActionNeedTarget(actionTypeSubtree.type)) {
            return {
                title:   actionTypeSubtree.name,
                state:   getStateFromAction(actionTypeSubtree.type),
                buttons: [
                    // Text  New Menu     Action
                    ["Back", PARENT_MENU, doNothing],
                ],
            };
        } else {
            internalError("buildOneMenuNode() of untargeted ActionType");
            return CLEAR_MENU;
        }
    } else {
        // .action, .name, .state, .children
        let buttons = [];
        for (let i = 0; i < actionTypeSubtree.children.length; i++) {
            buttons.push(buildOneMenuButton(actionTypeSubtree.children[i]));
        }
        if (isTop) {
            buttons.push([
                "Cancel",
                CLEAR_MENU,
                () => { deselectCharacter(); },
            ]);
        } else {
            buttons.push(["Back", PARENT_MENU, doNothing]);
        }
        return {
            title:   actionTypeSubtree.name,
            state:   actionTypeSubtree.state,
            buttons: buttons,
        };
    }
}

function buildOneMenuButton(actionTypeSubtree) {
    if (actionTypeSubtree.action) {
        // .action, .name, .type
        if (doesActionNeedTarget(actionTypeSubtree.type)) {
            return [
                actionTypeSubtree.name,
                buildOneMenuNode(actionTypeSubtree, false),
                doNothing,
            ];
        } else {
            return [
                actionTypeSubtree.name,
                CLEAR_MENU,
                () => {
                    doAction(makeUntargetedAction(actionTypeSubtree.type),
                        afterPlayerMove);
                },
            ];
        }
    } else {
        // .action, .name, .state, .children
        return [
            actionTypeSubtree.name,
            buildOneMenuNode(actionTypeSubtree, false),
            doNothing,
        ];
    }
}

export function doMenu(menuDesc) {
    transitionToMenuDesc(menuDesc, /* isTop = */true);
}

export function clearMenu() {
    setGlobalState(clearMenuState);
    Crafty.s("ButtonMenu").clearMenu();
}

function transitionToMenuDesc(menuDesc, isTop) {
    if (menuDesc === CLEAR_MENU) {
        clearMenu();
    } else if (menuDesc === PARENT_MENU) {
        // Pop menu
        if (menuStack.length === 0) {
            Crafty.s("ButtonMenu").clearMenu();
            currMenuDesc = null;
        } else {
            menuDesc = menuStack.pop();
            applyMenuByDesc(menuDesc);
            currMenuDesc = menuDesc;
        }
    } else {
        applyMenuByDesc(menuDesc);
        // TODO: If isTop, do we clear the stack anywhere?
        if (currMenuDesc !== null && !isTop) {
            menuStack.push(currMenuDesc);
        }
        currMenuDesc = menuDesc;
    }
}

function applyMenuByDesc(menuDesc) {
    if (!menuDesc["title"] || !menuDesc["state"] || !menuDesc["buttons"]) {
        internalError("Description for menu is ill-formed.");
        return;
    }

    let title   = menuDesc["title"];
    let onEntry = menuDesc["onEntry"];
    let onExit  = menuDesc["onExit"];
    let state   = menuDesc["state"];

    // onEntry and onExit are optional. If they're not specified, just treat
    // them as doNothing.
    if (!onEntry) {
        onEntry = doNothing;
    }
    if (!onExit) {
        onExit = doNothing;
    }

    setGlobalState(state);

    let buttonList = [];
    for (let i = 0; i < menuDesc["buttons"].length; i++) {
        let buttonDesc = menuDesc["buttons"][i];
        if (buttonDesc.length !== 3) {
            internalError("Description for menu is ill-formed.");
            return;
        }
        let buttonText   = buttonDesc[0];
        let newMenu      = buttonDesc[1];
        let buttonAction = buttonDesc[2];
        buttonList.push([
            buttonText,
            () => {
                buttonAction();
                onExit();
                transitionToMenuDesc(newMenu, /* isTop = */false);
            },
        ]);
    }

    debugLog("About to enter menu");
    onEntry();
    Crafty.s("ButtonMenu").setMenu(title, buttonList);
}
