/* global Crafty */

"use strict";

import {
    ANIM_DUR_SCROLL,
    MapGrid,
} from "./consts.js";

// TODO The underlying values maybe belong in consts.js?
const VIEW_HSTEP = MapGrid.tile.width  + MapGrid.tile.hspace;
const VIEW_VSTEP = MapGrid.tile.height + MapGrid.tile.vspace;

export function moveViewOnKeyDown(evt) {
    if (evt.key === Crafty.keys.LEFT_ARROW) {
        Crafty.viewport.pan(-VIEW_HSTEP, 0, ANIM_DUR_SCROLL);
    } else if (evt.key === Crafty.keys.RIGHT_ARROW) {
        Crafty.viewport.pan(VIEW_HSTEP, 0, ANIM_DUR_SCROLL);
    } else if (evt.key === Crafty.keys.UP_ARROW) {
        Crafty.viewport.pan(0, -VIEW_VSTEP, ANIM_DUR_SCROLL);
    } else if (evt.key === Crafty.keys.DOWN_ARROW) {
        Crafty.viewport.pan(0, VIEW_VSTEP, ANIM_DUR_SCROLL);
    }
}
