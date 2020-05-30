/* global Crafty */

"use strict";

import {
    GAME_HEIGHT,
    GAME_WIDTH,
    MENU_HEIGHT,
    MENU_WIDTH,
    WORLDVIEW_WIDTH,
    Z_UI,
} from "./consts.js";
import "./button.js";
import "./world_component.js";
import {
    setupKeyHandler,
    worldClickHandler,
} from "./ui.js";
import {
    initMessageDisplay,
    internalWarning,
    userMessage,
} from "./message.js";
import {
    initCamera,
} from "./view.js";
import {
    splash,
} from "./splash.js";
import {
    initDialogueDisplay,
} from "./dialogue.js";


export function doTheThing() {
    // Initialize Crafty on the div with id "game". Check that this isn't
    // changing the size of that div, since that causes the page elements to
    // jump around.
    let gameNode = document.getElementById("game");
    if (gameNode.clientWidth !== GAME_WIDTH) {
        internalWarning(`"game" div has width ${gameNode.clientWidth}, ` +
            `should be ${GAME_WIDTH}.`);
    }
    if (gameNode.clientHeight !== GAME_HEIGHT) {
        internalWarning(`"game" div has height ${gameNode.clientHeight}, ` +
            `should be ${GAME_HEIGHT}.`);
    }
    Crafty.init(GAME_WIDTH, GAME_HEIGHT, gameNode);

    // Initialize background stuff
    Crafty.background("#ccc");

    Crafty.createLayer("UILayer", "DOM", {
        // Ignore viewscreen transforms
        xResponse:     0,
        yResponse:     0,
        scaleResponse: 0,

        // On top of other layers
        z: Z_UI,
    });

    // Background for the buttons
    Crafty.e("2D, UILayer, Color, Mouse")
            .attr({x: 0, y: 0, w: MENU_WIDTH, h: MENU_HEIGHT})
            .color("#eee");

    initCamera();

    setupKeyHandler();

    // Initialize message log. This has to go after creating the UILayer
    // because the message log is on the UILayer.
    initMessageDisplay(
        {
            x: MENU_WIDTH + WORLDVIEW_WIDTH / 2 - 150,
            y: 50,
            w: 300,
            h: 25,
        });
    userMessage("Haldo World!");
    initDialogueDisplay(
        {
            x: MENU_WIDTH + WORLDVIEW_WIDTH / 2 - 200,
            y: 400,
            w: 400,
            h: 100,
        });

    // Setup various event handlers.

    // Convert regular mouse events to WorldClick events, so we can handle
    // that case without doing weird things when the player clicks on the
    // UI pane.
    Crafty.s("Mouse").bind("MouseUp", function(e) {
        // HACK: I can get the world position using [e.realX, e.realY], but
        // I can't find a way to get the screen position directly. So
        // manually do the viewport calculation to transform it.
        let worldX = e.realX;
        let viewRect = Crafty.viewport.rect();
        let screenX = (worldX - viewRect._x) * GAME_WIDTH / viewRect._w;

        if (screenX >= MENU_WIDTH) {
            Crafty.trigger("WorldClick", e);
        }
    });

    Crafty.bind("WorldClick", function(evt) {
        worldClickHandler(evt);
    });

    // Request sprite assets. Once they arrive, we'll load the level.
    // Based on the example from:
    //     http://craftyjs.com/documentation/sprites.html
    // (the JS Bin link at the bottom).
    Crafty.paths({"images": "../assets/sprites/"});
    Crafty.load(
        {
            "sprites": {
                "characters.png": {
                    tile:     32,
                    tileh:    32,
                    paddingX: 1,
                    map:      {
                        // TODO better name
                        anim_start: [0, 0],
                    },
                },
                "enemy.png": {
                    tile:     32,
                    tileh:    32,
                    paddingX: 1,
                    map:      {
                        enemy_anim_start: [0, 0],
                    },
                },
                "ground.png": {
                    tile:     32,
                    tileh:    32,
                    map:      {
                        ground_anim: [0, 0],
                    },
                },
                "tree.png": {
                    tile:     32,
                    tileh:    32,
                    map:      {
                        tree_anim: [0, 0],
                    },
                },
                "door.png": {
                    tile:     32,
                    tileh:    32,
                    map:      {
                        closed_door: [0, 0],
                        open_door:   [1, 0],
                    },
                },
                "lever.png": {
                    tile:     32,
                    tileh:    32,
                    map:      {
                        unpulled_lever: [0, 0],
                        pulled_lever:   [1, 0],
                    },
                },
                "bullet.png": {
                    tile:     32,
                    tileh:    32,
                    map:      {
                        bullet_anim: [0, 0],
                    },
                },
            },
        },
        function() {
            splash();
        },
    );
}
