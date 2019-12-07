/* global Crafty */

"use strict";

import {
    ANIM_DUR_CENTER_TURN,
    ANIM_DUR_SCROLL,
    MapGrid,
    MENU_WIDTH,
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

export function setFocusOn(character, callback) {
    Crafty.viewport.clampToEntities = false;
    centerCameraOn(character, ANIM_DUR_CENTER_TURN, callback);
}

function centerCameraOn(target, time, callback) {
    var x = target.x + Crafty.viewport.x;
    var y = target.y + Crafty.viewport.y;
    // TODO Do we want to camera center based on the grid
    //      or based on the center of characters
    var midX = target.w / 2;
    var midY = target.h / 2;

    var centX = ((Crafty.viewport.width + MENU_WIDTH) / 2) /
        Crafty.viewport._scale;
    var centY = Crafty.viewport.height / 2 / Crafty.viewport._scale;
    var newX = x + midX - centX;
    var newY = y + midY - centY;

    Crafty.viewport.pan(newX, newY, time);
    Crafty.one("CameraAnimationDone", callback);
}

