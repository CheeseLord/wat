/* global Crafty */

"use strict";

import {StateEnum} from "./consts.js";

import {
    selectedCharacter,
    endCharacter,
    setGlobalState,
    deselectCharacter,
    specialAttack,
    endTeam,
} from  "./action.js";

///////////////////////////////////////////////////////////////////////////////
// Menu table handling

const CLEAR_MENU  = {};
const PARENT_MENU = {};

// menuStack - list of menus that would be transitioned to if you click a
//     "back" button. Does not include the current menu.
// currMenuName - the name of the currently-displayed menu, or null if there is
//     no menu displayed.
export var menuStack    = [];
export var currMenuName = null;

function doNothing() {}

var menuTable = {
    topMenu: {
        title:   "Select Action",
        state:   StateEnum.CHARACTER_SELECTED,
        buttons: [
            // Text         New Menu      Action
            ["Move",        "move",       doNothing],
            ["Swap places", "swapPlaces", doNothing],
            ["Attack",      "attack",     doNothing],
            ["Interact",    "interact",   doNothing],
            ["End Turn",    CLEAR_MENU,   () => {
                deselectCharacter();
                endTeam();
            }],
            ["Cancel",      CLEAR_MENU,   () => { deselectCharacter(); }],
        ],
    },

    move: {
        title:   "Moving",
        state:   StateEnum.CHARACTER_MOVE,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    swapPlaces: {
        title:   "Swap Places",
        state:   StateEnum.CHARACTER_SWAP,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    interact: {
        title:   "Interact",
        state:   StateEnum.CHARACTER_INTERACT,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    attack: {
        title:   "Attack",
        state:   StateEnum.CHARACTER_ATTACK,
        buttons: [
            // Text            New Menu       Action
            ["Basic Attack",   "basicAttack", doNothing],
            ["Special Attack", CLEAR_MENU,
                () => {
                    specialAttack(selectedCharacter);
                    endCharacter(selectedCharacter);
                }],
            ["Back",           PARENT_MENU,   doNothing],
        ],
    },

    basicAttack: {
        title:   "Basic Attack",
        state:   StateEnum.CHARACTER_ATTACK,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },
};

export function doMenu(menuName) {
    transitionToMenu(menuName, /* isTop = */true);
}

function transitionToMenu(menuName, isTop) {
    if (menuName === CLEAR_MENU) {
        Crafty.s("ButtonMenu").clearMenu();
    } else if (menuName === PARENT_MENU) {
        // Pop menu
        if (menuStack.length === 0) {
            Crafty.s("ButtonMenu").clearMenu();
            currMenuName = null;
        } else {
            menuName = menuStack.pop();
            applyMenuByName(menuName);
            currMenuName = menuName;
        }
    } else {
        applyMenuByName(menuName);
        if (currMenuName && !isTop) {
            menuStack.push(currMenuName);
        }
        currMenuName = menuName;
    }
}

function applyMenuByName(menuName) {
    let menuDesc = menuTable[menuName];
    if (!menuDesc) {
        Crafty.error("No such menu: " + menuName);
        return;
    }
    if (!menuDesc["title"] || !menuDesc["state"] || !menuDesc["buttons"]) {
        Crafty.error("Description for menu '" + menuName + "' is ill-formed.");
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
            Crafty.error("Description for menu '" + menuName +
                "' is ill-formed.");
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
                transitionToMenu(newMenu, /* isTop = */false);
            },
        ]);
    }

    Crafty.log("Enter menu: " + menuName);
    onEntry();
    Crafty.s("ButtonMenu").setMenu(title, buttonList);
}
