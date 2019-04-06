/* global Crafty */

"use strict";

import {
    MENU_WIDTH,
    Game,
} from "./consts.js";
import "./button.js";
import "./world_component.js";
import {
    newTurn,
    worldClickHandler,
} from "./action.js";


export function doTheThing() {
    Crafty.init(Game.width, Game.height,
        document.getElementById("game"));
    Crafty.background("#ccc");

    // Add a test sprite at an arbitrary place in the world, to prove that
    // we can sprite.
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
            },
        },
        function() {
            // TODO: Player 1 as well.
            Crafty.e("2D, DOM, anim_start, SpriteAnimation")
                    .attr({x: 32, y: -32, w: 32, h: 32})
                    .reel("p1_animation", 1000, [
                        [0, 0], [1, 0], [2, 0], [3, 0],
                    ])
                    .animate("p1_animation", -1);

            Crafty.e("Character, anim_start, SpriteAnimation")
                    // .attr({x: 96, y: -32, w: 32, h: 32})
                    .setPos({x: 7, y: 3})
                    .setTeam(0)
                    .reel("p2_animation", 1000, [
                        [0, 1], [1, 1], [2, 1], [3, 1],
                    ])
                    .animate("p2_animation", -1);

            Crafty.e("Character, anim_start, SpriteAnimation")
                    // .attr({x: 32, y:  32, w: 32, h: 32})
                    .setPos({x: 7, y: 5})
                    .setTeam(1)
                    .reel("p3_animation", 1000, [
                        [0, 2], [1, 2], [2, 2], [3, 2],
                    ])
                    .animate("p3_animation", -1);

            Crafty.e("Character, anim_start, SpriteAnimation")
                    // .attr({x: 96, y:  32, w: 32, h: 32})
                    .setPos({x: 5, y: 5})
                    .setTeam(1)
                    .reel("p4_animation", 1000, [
                        [0, 3], [1, 3], [2, 3], [3, 3],
                    ])
                    .animate("p4_animation", -1);

            newTurn(0);
            // assert(readyCharacters.length > 0);
        }
    );

    // Static enemies
    Crafty.e("Enemy").setPos({x: 11, y:  3});
    Crafty.e("Enemy").setPos({x: 19, y: 11});
    Crafty.e("Enemy").setPos({x:  8, y: 11});
    Crafty.e("Enemy").setPos({x: 11, y: 12});
    Crafty.e("Enemy").setPos({x: 14, y:  9});
    Crafty.e("Enemy").setPos({x: 21, y:  5});
    Crafty.e("Enemy").setPos({x: 17, y: 13});
    Crafty.e("Enemy").setPos({x:  2, y: 13});
    Crafty.e("Enemy").setPos({x:  2, y:  9});

    var player1 = Crafty.e("Character, Color")
            .setPos({x: 5, y: 3})
            .setTeam(0)
            .setColors(
                {
                    defaultColor:     "#007000",
                    highlightedColor: "#00bf00",
                });

    Crafty.createLayer("UILayer", "DOM", {
        // Ignore viewscreen transforms
        xResponse:     0,
        yResponse:     0,
        scaleResponse: 0,

        // On top of other layers
        z: 40,
    });

    // Background for the buttons
    Crafty.e("2D, UILayer, Color, Mouse")
            .attr({x: 0, y: 0, w: MENU_WIDTH, h: Game.height})
            .color("#eee");

    // Animate centering the viewport over the player, taking 1500ms to do
    // it. Then, once the animation is done, set the viewport to follow the
    // player (with offset (0, 0)).
    Crafty.viewport.clampToEntities = false;
    Crafty.one("CameraAnimationDone", function() {
        Crafty.viewport.follow(player1, MENU_WIDTH / 2, 0);
    });
    // TODO: We need our own function for this that adds in the right
    // offset, so there isn't a sudden jump. The library implementation is
    // Crafty/viewport.js#L324-L335.
    Crafty.viewport.centerOn(player1, 1500);

    // Convert regular mouse events to WorldClick events, so we can handle
    // that case without doing weird things when the player clicks on the
    // UI pane.
    Crafty.s("Mouse").bind("MouseUp", function(e) {
        // HACK: I can get the world position using [e.realX, e.realY], but
        // I can't find a way to get the screen position directly. So
        // manually do the viewport calculation to transform it.
        let worldX = e.realX;
        let viewRect = Crafty.viewport.rect();
        let screenX = (worldX - viewRect._x) * Game.width / viewRect._w;

        if (screenX >= MENU_WIDTH) {
            Crafty.trigger("WorldClick", e);
        }
    });

    Crafty.bind("WorldClick", function(evt) {
        worldClickHandler(evt);
    });
}

