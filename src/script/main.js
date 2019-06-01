/* global Crafty */

"use strict";

import {
    ANIM_DUR_SCROLL,
    MENU_WIDTH,
    Game,
    MapGrid,
    Z_UI,
} from "./consts.js";
import "./button.js";
import "./world_component.js";
import {
    startTeam,
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
            Crafty.e("SpriteCharacter")
                    .setPos({x: 5, y: 3})
                    .setTeam(0)
                    .setAnimation(0, 4);

            Crafty.e("SpriteCharacter")
                    .setPos({x: 7, y: 3})
                    .setTeam(0)
                    .setAnimation(1, 4);

            Crafty.e("SpriteCharacter")
                    .setPos({x: 5, y: 5})
                    .setTeam(1)
                    .setAnimation(2, 4);

            Crafty.e("SpriteCharacter")
                    .setPos({x: 7, y: 5})
                    .setTeam(1)
                    .setAnimation(3, 4);

            startTeam(0);
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

    // The ground
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 30; x++) {
            if (x === 6 && y === 7) {
                Crafty.e("Tree").setPos({x: x, y: y});
            } else {
                Crafty.e("Ground").setPos({x: x, y: y});
            }
        }
    }

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

