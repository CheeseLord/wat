/* global Crafty */

"use strict";

import {
    ANIM_DUR_CENTER_TURN,
    MENU_WIDTH,
} from "./consts.js";

let cameraTarget;

export function initCamera() {
    // NOTE: To debug the camera when it inevitably breaks, make it visible by
    // adding the "Color" component and calling .color().
    cameraTarget = Crafty.e("2D, DOM, Multiway, Tween, Color")
            .attr({x: 0, y: 0, z: 100, w: 10, h: 10})
            .color("red")
            .multiway(800, {
                UP_ARROW:    -90,
                DOWN_ARROW:  90,
                LEFT_ARROW:  180,
                RIGHT_ARROW: 0,
            });
    Crafty.viewport.clampToEntities = false;
    Crafty.viewport.follow(cameraTarget, MENU_WIDTH / 2, 0);
}

export function setFocusOn(character, callback) {
    var x = character.x + Crafty.viewport.x;
    var y = character.y + Crafty.viewport.y;

    // TODO Do we want to camera center based on the grid
    //      or based on the center of characters
    var midX = character.w / 2;
    var midY = character.h / 2;

    var centX = ((Crafty.viewport.width + MENU_WIDTH) / 2) /
        Crafty.viewport._scale;
    var centY = Crafty.viewport.height / 2 / Crafty.viewport._scale;
    var newX = x + midX - centX;
    var newY = y + midY - centY;

    Crafty.one("TweenEnd", callback);
    cameraTarget.tween({x: newX, y: newY}, ANIM_DUR_CENTER_TURN);
}

