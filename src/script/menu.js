/* global Crafty */

"use strict";

import {StateEnum} from "./consts.js";

import {
    ActionType,
    endTurnAction,
    specialAttackAction,
} from "./action_type.js";
import {
    chooseAiAction,
} from  "./ai.js";
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

// eslint-disable-next-line no-unused-vars
const ACTION_TYPE_TREE = {
    action:   false,
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
        {
            action: true,
            name:   "End Turn",
            type:   ActionType.END_TURN,
        },
    ],
};

// TODO move these functions somewhere better

// TODO [#36]: Rework globalState
// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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
    const moveMenu = {
        title:   "Moving",
        state:   StateEnum.CHARACTER_MOVE,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    };

    const swapPlacesMenu = {
        title:   "Swap Places",
        state:   StateEnum.CHARACTER_SWAP,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    };

    const interactMenu = {
        title:   "Interact",
        state:   StateEnum.CHARACTER_INTERACT,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    };

    const basicAttackMenu = {
        title:   "Basic Attack",
        state:   StateEnum.CHARACTER_ATTACK,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    };

    const rangedAttackMenu = {
        title:   "Ranged Attack",
        state:   StateEnum.CHARACTER_RANGED_ATTACK,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    };

    const attackMenu = {
        title:   "Attack",
        state:   StateEnum.CHARACTER_ATTACK,
        buttons: [
            // Text            New Menu          Action
            ["Basic Attack",   basicAttackMenu,  doNothing],
            ["Ranged Attack",  rangedAttackMenu, doNothing],
            ["Special Attack", CLEAR_MENU,       () => {
                doAction(
                    specialAttackAction(selectedCharacter),
                    afterPlayerMove
                );
            }],
            ["Back",           PARENT_MENU,   doNothing],
        ],
    };

    const topMenu = {
        title:   "Select Action",
        state:   StateEnum.CHARACTER_SELECTED,
        buttons: [
            // Text         New Menu      Action
            ["Move",        moveMenu,       doNothing],
            ["Swap places", swapPlacesMenu, doNothing],
            ["Attack",      attackMenu,     doNothing],
            ["Interact",    interactMenu,   doNothing],
            ["Auto Attack", CLEAR_MENU,     () => {
                doAction(chooseAiAction(selectedCharacter), afterPlayerMove);
            }],
            ["End Turn",    CLEAR_MENU,     () => {
                doAction(endTurnAction(selectedCharacter), afterPlayerMove);
            }],
            ["Cancel",      CLEAR_MENU,     () => { deselectCharacter(); }],
        ],
    };

    return topMenu;
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
