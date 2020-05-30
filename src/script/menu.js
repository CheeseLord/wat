/* global Crafty */

"use strict";

import {StateEnum} from "./consts.js";

import {
    EndTurnAction,
    InteractAction,
    MeleeAttackAction,
    MoveAction,
    RangedAttackAction,
    SpecialAttackAction,
    SwapPlacesAction,
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
    canDoAction,
    setGlobalState,
} from  "./resolve_action.js";
import {
    afterPlayerMove,
    deselectCharacter,
    // TODO: Does this work??
    selectedCharacter,
} from "./turn_order.js";

///////////////////////////////////////////////////////////////////////////////
// Static definition of menu structure.

const ACTION_TYPE_TREE = {
    action:   false,
    name:     "Select Action",
    state:    StateEnum.CHARACTER_SELECTED,
    children: [
        {
            action: true,
            name:   "Move",
            type:   MoveAction,
        },
        {
            action: true,
            name:   "Swap Places",
            type:   SwapPlacesAction,
        },
        {
            action:   false,
            name:     "Attack",
            state:    StateEnum.CHARACTER_ATTACK,
            children: [
                {
                    action: true,
                    name:   "Melee Attack",
                    type:   MeleeAttackAction,
                },
                {
                    action: true,
                    name:   "Ranged Attack",
                    type:   RangedAttackAction,
                },
                {
                    action: true,
                    name:   "Special Attack",
                    type:   SpecialAttackAction,
                },
            ],
        },
        {
            action: true,
            name:   "Interact",
            type:   InteractAction,
        },
        // TODO: Custom entry for this button we used to have:
        //   ["Auto Attack", CLEAR_MENU, () => {
        //       let action = chooseAiAction(selectedCharacter);
        //       action.type.doit(action, afterPlayerMove);
        //   }],
        {
            action: true,
            name:   "End Turn",
            type:   EndTurnAction,
        },
    ],
};

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

export function getTopMenu(character) {
    return buildOneMenuNode(ACTION_TYPE_TREE, character, /* isTop = */true);
}

function buildOneMenuNode(actionTypeSubtree, character, isTop) {
    if (actionTypeSubtree.action) {
        // .action, .name, .type
        if (actionTypeSubtree.type.isTargeted()) {
            return {
                title:   actionTypeSubtree.name,
                state:   actionTypeSubtree.type.getState(),
                buttons: [
                    // Text  New Menu     Action
                    ["Back", PARENT_MENU, doNothing],
                ],
            };
        } else {
            internalError("buildOneMenuNode() of untargeted action type");
            return CLEAR_MENU;
        }
    } else {
        // .action, .name, .state, .children
        let buttons = [];
        for (let i = 0; i < actionTypeSubtree.children.length; i++) {
            let nextButton = buildOneMenuButton(actionTypeSubtree.children[i],
                character);
            if (nextButton !== null) {
                buttons.push(nextButton);
            }
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

function buildOneMenuButton(actionTypeSubtree, character) {
    if (actionTypeSubtree.action) {
        // .action, .name, .type
        if (!canDoAction(character, actionTypeSubtree.type)) {
            return null;
        }
        if (actionTypeSubtree.type.isTargeted()) {
            return [
                actionTypeSubtree.name,
                buildOneMenuNode(actionTypeSubtree, character, false),
                doNothing,
            ];
        } else {
            return [
                actionTypeSubtree.name,
                CLEAR_MENU,
                () => {
                    let action = makeUntargetedAction(actionTypeSubtree.type);
                    action.type.doit(action, afterPlayerMove);
                },
            ];
        }
    } else {
        // .action, .name, .state, .children
        return [
            actionTypeSubtree.name,
            buildOneMenuNode(actionTypeSubtree, character, false),
            doNothing,
        ];
    }
}

function makeUntargetedAction(actionType) {
    return actionType.initNoTarget(selectedCharacter);
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
