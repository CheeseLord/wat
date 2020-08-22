/* global Crafty */

"use strict";

import {ClickEnum} from "./consts.js";

import {
    EndTurnAction,
    FireballSpellAction,
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
    assert,
} from "./message.js";
import {
    canDoAction,
} from  "./resolve_action.js";
import {
    state,
} from "./state.js";
import {
    deselectCharacter,
    gotPlayerAction,
    selectedCharacter,
} from "./turn_order.js";

///////////////////////////////////////////////////////////////////////////////
// Static definition of menu structure.

const ACTION_TYPE_TREE = {
    action:   false,
    name:     "Select Action",
    state:    ClickEnum.CHARACTER_SELECTED,
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
            state:    ClickEnum.CHARACTER_ATTACK,
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
                // TODO: Separate submenu for spells?
                {
                    action: true,
                    name:   "Fireball",
                    type:   FireballSpellAction,
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
// Menu logic

const clearMenuClickType = ClickEnum.DEFAULT;

let actionMenuPos = [];
let actionMenuCharacter = null;

export function doActionMenu(character) {
    actionMenuCharacter = character;
    clearActionMenu();
    pushActionSubmenu(ACTION_TYPE_TREE);
}

function pushActionSubmenu(subtree) {
    actionMenuPos.push(subtree);
    displayActionMenuPage(subtree);
}

function popActionMenu() {
    actionMenuPos.pop(1);
    if (actionMenuPos.length === 0) {
        // We popped the last one.
        clearActionMenu();
        deselectCharacter();
    } else {
        displayActionMenuPage(actionMenuPos[actionMenuPos.length - 1]);
    }
}

function clearActionMenu() {
    state.clickType = clearMenuClickType;
    Crafty.s("ButtonMenu").clearMenu();
    actionMenuPos = [];
}

function displayActionMenuPage(subtree) {
    // Set clickType.
    // TODO rename these from "state".
    if (!subtree.action) {
        state.clickType = subtree.state;
    } else {
        assert(subtree.type.isTargeted());
        state.clickType = subtree.type.getState();
    }

    let title = subtree.name;

    // Build the button descriptions for all children of this subnode.
    let buttonDescs = [];
    if (!subtree.action) {
        for (let i = 0; i < subtree.children.length; i++) {
            let child = subtree.children[i];
            let onClick;
            if (!child.action) {
                // A sub-submenu.
                onClick = function() {
                    pushActionSubmenu(child);
                };
            } else if (!canDoAction(actionMenuCharacter, child.type)) {
                continue;
            } else if (child.type.isTargeted()) {
                // Targeted actions also get their own submenus.
                onClick = function() {
                    pushActionSubmenu(child);
                };
            } else {
                // Untargeted actions just get executed.
                onClick = function() {
                    clearActionMenu();
                    let action = makeUntargetedAction(child.type);
                    gotPlayerAction(action);
                };
            }
            buttonDescs.push([child.name, onClick]);
        }
    }

    // All submenus have a Back/Cancel button. The difference in implementation
    // is handled by popActionMenu.
    let backName = "Back";
    if (actionMenuPos.length === 1) {
        // This is the top menu.
        backName = "Cancel";
    }
    buttonDescs.push([backName, popActionMenu]);

    Crafty.s("ButtonMenu").setMenu(title, buttonDescs);
}

function makeUntargetedAction(actionType) {
    return actionType.initNoTarget(selectedCharacter);
}

