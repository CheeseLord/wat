/* global Crafty */

"use strict";

import {
    ANIM_DUR_SCROLL,
    MENU_WIDTH,
    Game,
    MapGrid,
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
            let player1 = Crafty.e("Character, anim_start, SpriteAnimation")
                    .setPos({x: 5, y: 3})
                    .setTeam(0)
                    .reel("p1_animation", 1000, [
                        [0, 0], [1, 0], [2, 0], [3, 0],
                    ])
                    .animate("p1_animation", -1);

            Crafty.e("Character, anim_start, SpriteAnimation")
                    .setPos({x: 7, y: 3})
                    .setTeam(0)
                    .reel("p2_animation", 1000, [
                        [0, 1], [1, 1], [2, 1], [3, 1],
                    ])
                    .animate("p2_animation", -1);

            Crafty.e("Character, anim_start, SpriteAnimation")
                    .setPos({x: 7, y: 5})
                    .setTeam(1)
                    .reel("p3_animation", 1000, [
                        [0, 2], [1, 2], [2, 2], [3, 2],
                    ])
                    .animate("p3_animation", -1);

            Crafty.e("Character, anim_start, SpriteAnimation")
                    .setPos({x: 5, y: 5})
                    .setTeam(1)
                    .reel("p4_animation", 1000, [
                        [0, 3], [1, 3], [2, 3], [3, 3],
                    ])
                    .animate("p4_animation", -1);

            newTurn(0);
            // assert(readyCharacters.length > 0);

            // Animate centering the viewport over the player, taking 1500ms to
            // do it.
            Crafty.viewport.clampToEntities = false;
            // TODO: We need our own function for this that adds in the right
            // offset, so there isn't a sudden jump. The library implementation
            // is Crafty/viewport.js#L324-L335.
            Crafty.viewport.centerOn(player1, 1500);
            // TODO: Handle this using the usual start-of-turn code, rather
            // than having a special case here.
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

    Crafty.s("Keyboard").bind("KeyDown", function(e) {
        if (e.key === Crafty.keys.LEFT_ARROW) {
            Crafty.viewport.pan(-MapGrid.tile.width, 0, ANIM_DUR_SCROLL);
        } else if (e.key === Crafty.keys.RIGHT_ARROW) {
            Crafty.viewport.pan(MapGrid.tile.width, 0, ANIM_DUR_SCROLL);
        } else if (e.key === Crafty.keys.UP_ARROW) {
            Crafty.viewport.pan(0, -MapGrid.tile.height, ANIM_DUR_SCROLL);
        } else if (e.key === Crafty.keys.DOWN_ARROW) {
            Crafty.viewport.pan(0, MapGrid.tile.height, ANIM_DUR_SCROLL);
        }
    });
}

