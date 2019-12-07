/* global Crafty */

"use strict";

import {
    MENU_WIDTH,
    Game,
    Z_UI,
} from "./consts.js";
import "./button.js";
import "./world_component.js";
import {
    worldClickHandler,
} from "./ui.js";
import {
    readyCharacters,
    startTeam,
} from "./action.js";
import {
    updateMapForNewLevel,
} from "./geometry.js";
import {
    assert,
    // TODO why does this not fail linting?
    // displayMessage,
    initMessageDisplay,
    internalWarning,
    userMessage,
} from "./message.js";
import {
    moveViewOnKeyDown,
} from "./view.js";


export function doTheThing() {
    // Initialize Crafty on the div with id "game". Check that this isn't
    // changing the size of that div, since that causes the page elements to
    // jump around.
    let gameNode = document.getElementById("game");
    if (gameNode.clientWidth !== Game.width) {
        internalWarning(`"game" div has width ${gameNode.clientWidth}, ` +
            `should be ${Game.width}.`);
    }
    if (gameNode.clientHeight !== Game.height) {
        internalWarning(`"game" div has height ${gameNode.clientHeight}, ` +
            `should be ${Game.height}.`);
    }
    Crafty.init(Game.width, Game.height, gameNode);

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
            .attr({x: 0, y: 0, w: MENU_WIDTH, h: Game.height})
            .color("#eee");

    // Initialize message log. This has to go after creating the UILayer
    // because the message log is on the UILayer.
    initMessageDisplay(
        {
            x: MENU_WIDTH + (Game.width - MENU_WIDTH) / 2 - 150,
            y: 50,
            w: 300,
            h: 25,
        });
    userMessage("Haldo World!");

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
        let screenX = (worldX - viewRect._x) * Game.width / viewRect._w;

        if (screenX >= MENU_WIDTH) {
            Crafty.trigger("WorldClick", e);
        }
    });

    Crafty.bind("WorldClick", function(evt) {
        worldClickHandler(evt);
    });

    Crafty.s("Keyboard").bind("KeyDown", moveViewOnKeyDown);

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
            },
        },
        loadLevel1
    );
}

function loadLevel1() {
    // Ground et al.
    for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 17; x++) {
            if (x === 8 && y === 6) {
                // The lever that opens the door.
                Crafty.e("Lever")
                        .initPos({x: x, y: y})
                        .setIdString("DoorControl");
            } else if (x === 1 && y === 1) {
                // A second lever, which doesn't open the door.
                Crafty.e("Lever").initPos({x: x, y: y});
            } else if (x === 9 && y === 5) {
                Crafty.e("Door")
                        .initPos({x: x, y: y})
                        .bind("Interact", function(evtData) {
                            if (evtData.idString === "DoorControl") {
                                this.toggleOpen();
                            }
                        });
            } else if (x === 0 || x === 9 || x === 16 || y === 0 || y === 10) {
                // TODO: Some other sort of walls?
                Crafty.e("Tree").initPos({x: x, y: y});
            }
            Crafty.e("Ground").initPos({x: x, y: y});
        }
    }

    // Player characters
    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 2})
            .setName_("Not Greg")
            .maxHealth(15)
            .setSpeed(2)
            .setTeam(0)
            .setAnimation(0, 4);

    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 4})
            .setName_("Also Not Greg")
            .maxHealth(15)
            .setSpeed(4)
            .setTeam(0)
            .setAnimation(1, 4);

    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 6})
            .setName_("Not Joel")
            .maxHealth(15)
            .setSpeed(4)
            .setTeam(0)
            .setAnimation(2, 4);

    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 8})
            .setName_("Samson")
            .maxHealth(15)
            .setSpeed(8)
            .setTeam(0)
            .setAnimation(3, 4);

    // Enemies
    let ENEMY_POSITIONS = [
        {team: 1, pos: {x:  6, y:  3}},
        {team: 1, pos: {x:  6, y:  5}},
        {team: 1, pos: {x:  6, y:  7}},
        {team: 2, pos: {x: 12, y:  2}},
        {team: 2, pos: {x: 14, y:  3}},
        {team: 2, pos: {x: 12, y:  4}},
        {team: 2, pos: {x: 12, y:  6}},
        {team: 2, pos: {x: 14, y:  7}},
        {team: 2, pos: {x: 12, y:  8}},
    ];
    for (let i = 0; i < ENEMY_POSITIONS.length; i++) {
        let team = ENEMY_POSITIONS[i].team;
        let pos  = ENEMY_POSITIONS[i].pos;
        Crafty.e("Enemy")
                .initPos(pos)
                .setTeam(team)
                .maxHealth(10);
    }

    // Finish up.
    updateMapForNewLevel();
    startTeam(0);
    assert(readyCharacters.length > 0);
}

