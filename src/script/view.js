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
    cameraTarget = Crafty.e("2D, DOM, Multiway, Tween")
            .attr({x: 0, y: 0, z: 100, w: 10, h: 10})
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
    var x = character.x + character.w / 2 - cameraTarget.w / 2;
    var y = character.y + character.h / 2 - cameraTarget.h / 2;

    cameraTarget.one("TweenEnd", callback);
    cameraTarget.tween({x: x, y: y}, ANIM_DUR_CENTER_TURN);
}

