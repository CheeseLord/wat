// TODO get this working and linting if we're actually going to use it.
/* eslint no-multi-spaces: 0 */
/* eslint no-undef: 0 */
/* eslint no-unused-vars: 0 */

"use strict";

var CLEAR_MENU  = {};
var PARENT_MENU = {};

function doNothing() {}

var menuTable = {
    topMenu: {
        title:   "Select Action",
        state:   StateEnum.PLAYER_SELECTED,

        // --- Alternate, much more verbose version ---
        // buttons: [
        //     {
        //         text:    "Move",
        //         newMenu: "move",
        //         action:  doNothing,
        //     },
        //     {
        //         text:    "Swap places",
        //         newMenu: "swapPlaces",
        //         action:  doNothing,
        //     },
        //     {
        //         text:    "Attack",
        //         newMenu: "attack",
        //         action:  doNothing,
        //     },
        //     {
        //         text:    "Cancel",
        //         newMenu: CLEAR_MENU,
        //         action:  () => { deselectPlayer(); },
        //     },
        // ],

        buttons: [
            ["Move",        "move",       doNothing],
            ["Swap places", "swapPlaces", doNothing],
            ["Attack",      "attack",     doNothing],
            ["Cancel",      CLEAR_MENU,   () => { deselectPlayer(); }],
        ],

        // --- Or, for those of you who religiously oppose aligning ---
        // buttons: [
        //     ["Move", "move", doNothing],
        //     ["Swap places", "swapPlaces", doNothing],
        //     ["Attack", "attack", doNothing],
        //     ["Cancel", CLEAR_MENU, () => { deselectPlayer(); }],
        // ],
    },

    move: {
        title:   "Moving",
        state:   StateEnum.PLAYER_MOVE,
        onEntry: () => { createMovementGrid(selectedPlayer); },
        onExit:  () => { removeMovementSquares(); },
        buttons: [
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    swapPlaces: {
        title:   "Swap Places",
        state:   StateEnum.PLAYER_SWAP,
        buttons: [
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    attack: {
        title:   "Attack",
        state:   StateEnum.PLAYER_ATTACK,
        buttons: [
            ["Basic Attack",   "basicAttack", doNothing],
            ["Special Attack", CLEAR_MENU,
                () => {
                    specialAttack(selectedPlayer);
                    deselectPlayer();
                }],
            ["Back",           PARENT_MENU,   doNothing],
        ],
    },

    basicAttack: {
        title:   "Basic Attack",
        state:   StateEnum.PLAYER_ATTACK,
        buttons: [
            ["Back",           PARENT_MENU,   doNothing],
        ],
    },
};

