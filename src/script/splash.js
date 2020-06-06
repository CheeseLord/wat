/* global Crafty */

import {
    loadLevel1,
    loadLevel2,
} from "./levels.js";
import {
    beginLevel,
} from "./turn_order.js";


export function splash() {
    // Create a splash menu for level selection
    let buttonList = [
        [
            "Level 1",
            () => {
                loadLevel1(beginLevel);
            },
        ],
        [
            "Level 2",
            () => {
                loadLevel2(beginLevel);
            },
        ],
    ];
    Crafty.s("ButtonMenu").setMenu("Level Select", buttonList);
}
