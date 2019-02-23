/* global Crafty */

"use strict";
import "./button.js";
import {worldClickHandler} from "./action.js";

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
export var StateEnum = Object.freeze({
    DEFAULT:         {},
    PLAYER_SELECTED: {},
    PLAYER_MOVE:     {},
    PLAYER_SWAP:     {},
    PLAYER_ATTACK:   {},
});
export var globalState = StateEnum.DEFAULT;
export function changeGlobalState(newState) { globalState = newState; }

export var readyCharacters = [];
export var selectedPlayer;
export var enemies;


///////////////////////////////////////////////////////////////////////////////
// Menu-related functions (and some misc?)

export function reportUserError(text) {
    // TODO: Put this somewhere the user will actually see it.
    Crafty.error(text);
}

export function selectPlayer(player) {
    deselectPlayer();
    selectedPlayer = player;
    selectedPlayer.highlight();
}

export function removeMovementSquares() {
    Crafty("MovementSquare").each(function() {
        this.destroy();
    });
}

export function deselectPlayer() {
    if (selectedPlayer && selectedPlayer.isHighlighted()) {
        selectedPlayer.unhighlight();
        selectedPlayer = null;
        // TODO: Probably the menu table should instead define the state we
        // transition to on CLEAR_MENU?
        globalState = StateEnum.DEFAULT;
    }
}

export function characterActed(character) {
    deselectPlayer();

    // The character is no longer ready.
    let index = readyCharacters.indexOf(character);
    if (index === -1) {
        // TODO: We should never get here, but handle it better anyway.
        return;
    } else {
        readyCharacters.splice(index, 1);
    }


    // If no characters are ready, start the next turn.
    if (readyCharacters.length === 0) {
        Crafty.log("Reached end of round.");
        Crafty("PlayerControllable").each(function() {
            readyCharacters.push(this);
        });
    }
}

function createMovementSquare(x, y) {
    var occupied = false;
    Crafty("SpaceFillingObject").each(function() {
        if (this.getPos().x === x && this.getPos().y === y) {
            occupied = true;
        }
    });
    if (occupied) {
        return;
    }
    Crafty.e("MovementSquare").setPos({x: x, y: y});
}

function createMovementGrid(player) {
    var playerPos = player.getPos();
    var x = playerPos.x;
    var y = playerPos.y;
    // FIXME Move distance to player attribute
    var maxDistance = 4;
    for (var i = 1; i < maxDistance; i++) {
        for (var j = 1; j + i < maxDistance; j++) {
            createMovementSquare(x + i, y + j);
            createMovementSquare(x + i, y - j);
            createMovementSquare(x - i, y + j);
            createMovementSquare(x - i, y - j);
        }
        createMovementSquare(x + i, y);
        createMovementSquare(x - i, y);
        createMovementSquare(x, y + i);
        createMovementSquare(x, y - i);
    }
};

function isAdjacent(object1, object2) {
    return (Math.abs(object1.getPos().x - object2.getPos().x) <= 1 &&
        Math.abs(object1.getPos().y - object2.getPos().y) <= 1);
}

function specialAttack(player) {
    for (var i = enemies.length - 1; i >= 0; i--) {
        if (isAdjacent(player, enemies[i])) {
            enemies[i].destroy();
            enemies.splice(i, 1);
        }
    }
}


///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that occupies a grid space.
Crafty.c("GridObject", {
    // TODO: Remove Mouse (get cat?)
    required: "SpaceFillingObject, 2D, DOM, Color, Tween, Mouse",

    init: function() {
        this.attr({w: Game.mapGrid.tile.width, h: Game.mapGrid.tile.height});
        // Put us at (0, 0) by default just to ensure that _tileX and _tileY
        // are not undefined. Hopefully the caller will immediately move us to
        // a real position.
        this.setPos({x: 0, y: 0});
    },

    // Get and set the position in map-grid tiles (not pixels).
    getPos: function() {
        return {x: this._tileX, y: this._tileY};
    },
    setPos: function(newPos) {
        // newPos is {x: newX, y: newY}
        this.attr({
            _tileX: newPos.x,
            _tileY: newPos.y,
            x:      newPos.x * Game.mapGrid.tile.width,
            y:      newPos.y * Game.mapGrid.tile.height,
        });
        // So that "setter" attributes can be chained together.
        return this;
    },
    moveBy: function(deltaPos) {
        // deltaPos is {x: deltaX, y: deltaY}
        var oldPos = this.getPos();
        this.setPos({
            x: oldPos.x + deltaPos.x,
            y: oldPos.y + deltaPos.y,
        });
        return this;
    },
    // TODO: Don't duplicate so much code between this and setPos.
    animateTo: function(newPos) {
        // newPos is {x: newX, y: newY}
        this.attr({
            _tileX: newPos.x,
            _tileY: newPos.y,
        });
        this.tween({
            x: newPos.x * Game.mapGrid.tile.width,
            y: newPos.y * Game.mapGrid.tile.height,
        }, 200);
        // So that "setter" attributes can be chained together.
        return this;
    },
});

Crafty.c("MovementSquare", {
    required: "GridObject, Mouse",

    init: function() {
        this.color("#555555", 0.5);
    },
});

Crafty.c("PlayerControllable", {
    required: "GridObject, Keyboard, Mouse",

    init: function() {
        this.bind("KeyDown", function(e) {
            if (e.key === Crafty.keys.LEFT_ARROW) {
                this.moveBy({x: -1, y:  0});
            } else if (e.key === Crafty.keys.RIGHT_ARROW) {
                this.moveBy({x:  1, y:  0});
            } else if (e.key === Crafty.keys.UP_ARROW) {
                this.moveBy({x:  0, y: -1});
            } else if (e.key === Crafty.keys.DOWN_ARROW) {
                this.moveBy({x:  0, y:  1});
            }
        });
        this._isHighlighted = false;
    },

    setColors: function(newColors) {
        this.attr({
            _defaultColor:     newColors.defaultColor,
            _highlightedColor: newColors.highlightedColor,
        });
        // Start out not highlighted
        this.color(this._defaultColor);
        // So that "setter" attributes can be chained together.
        return this;
    },

    highlight: function() {
        this._isHighlighted = true;
        return this.color(this._highlightedColor);
    },
    unhighlight: function() {
        this._isHighlighted = false;
        return this.color(this._defaultColor);
    },
    isHighlighted: function() {
        return this._isHighlighted;
    },
});


///////////////////////////////////////////////////////////////////////////////
// Menu table handling

var CLEAR_MENU  = {};
var PARENT_MENU = {};

function doNothing() {}

var menuTable = {
    topMenu: {
        title:   "Select Action",
        state:   StateEnum.PLAYER_SELECTED,
        buttons: [
            // Text         New Menu      Action
            ["Move",        "move",       doNothing],
            ["Swap places", "swapPlaces", doNothing],
            ["Attack",      "attack",     doNothing],
            ["Cancel",      CLEAR_MENU,   () => { deselectPlayer(); }],
        ],
    },

    move: {
        title:   "Moving",
        state:   StateEnum.PLAYER_MOVE,
        onEntry: () => { createMovementGrid(selectedPlayer); },
        onExit:  () => { removeMovementSquares(); },
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    swapPlaces: {
        title:   "Swap Places",
        state:   StateEnum.PLAYER_SWAP,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },

    attack: {
        title:   "Attack",
        state:   StateEnum.PLAYER_ATTACK,
        buttons: [
            // Text            New Menu       Action
            ["Basic Attack",   "basicAttack", doNothing],
            ["Special Attack", CLEAR_MENU,
                () => {
                    specialAttack(selectedPlayer);
                    characterActed(selectedPlayer);
                }],
            ["Back",           PARENT_MENU,   doNothing],
        ],
    },

    basicAttack: {
        title:   "Basic Attack",
        state:   StateEnum.PLAYER_ATTACK,
        buttons: [
            // Text  New Menu     Action
            ["Back", PARENT_MENU, doNothing],
        ],
    },
};

export function doMenu(menuName) {
    transitionToMenu(menuName, /* isTop = */true);
}

function transitionToMenu(menuName, isTop) {
    if (menuName === CLEAR_MENU) {
        Crafty.s("ButtonMenu").clearMenu();
        return;
    } else if (menuName === PARENT_MENU) {
        Crafty.s("ButtonMenu").popMenu();
        return;
    }

    let menuDesc = menuTable[menuName];
    if (!menuDesc) {
        Crafty.error("No such menu: " + menuName);
        return;
    }
    if (!menuDesc["title"] || !menuDesc["state"] || !menuDesc["buttons"]) {
        Crafty.error("Description for menu '" + menuName + "' is ill-formed.");
        return;
    }

    let title   = menuDesc["title"];
    let onEntry = menuDesc["onEntry"];
    let onExit  = menuDesc["onExit"];
    let state   = menuDesc["state"];

    // onEntry and onExit are optional. If they're not specified, just treat
    // them as doNothing.
    if (!onEntry) {
        onEntry = doNothing;
    }
    if (!onExit) {
        onExit = doNothing;
    }

    globalState = state;

    let buttonList = [];
    for (let i = 0; i < menuDesc["buttons"].length; i++) {
        let buttonDesc = menuDesc["buttons"][i];
        if (buttonDesc.length !== 3) {
            Crafty.error("Description for menu '" + menuName +
                "' is ill-formed.");
            return;
        }
        let buttonText   = buttonDesc[0];
        let newMenu      = buttonDesc[1];
        let buttonAction = buttonDesc[2];
        buttonList.push([
            buttonText,
            () => {
                buttonAction();
                onExit();
                transitionToMenu(newMenu, /* isTop = */false);
            },
        ]);
    }

    Crafty.log("Enter menu: " + menuName);
    onEntry();
    if (isTop) {
        Crafty.s("ButtonMenu").setTopLevelMenu(title, buttonList);
    } else {
        Crafty.s("ButtonMenu").pushMenu(title, buttonList);
    }
}


///////////////////////////////////////////////////////////////////////////////
// Main Game object definition and startup code

export let Game = {
    mapGrid: {
        width:  25,
        height: 17,
        tile:   {
            width:  16,
            height: 16,
        },
    },

    width: function() {
        return this.mapGrid.width * this.mapGrid.tile.width;
    },

    height: function() {
        return this.mapGrid.height * this.mapGrid.tile.height;
    },

    start: function() {
        Crafty.init(Game.width(), Game.height(),
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
                    "test.png": {
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
                Crafty.e("2D, DOM, anim_start, SpriteAnimation")
                        .attr({x: 48, y: -32, w: 32, h: 32})
                        .reel("my_animation", 1000, [
                            [0, 0], [1, 0], [2, 0], [3, 0],
                        ])
                        .animate("my_animation", -1);
            }
        );

        // Enemy objects
        enemies = [
            Crafty.e("GridObject").color("#7f0000").setPos({x: 11, y:  3}),
            Crafty.e("GridObject").color("#7f0000").setPos({x: 19, y: 11}),
            Crafty.e("GridObject").color("#7f0000").setPos({x:  8, y: 11}),
            Crafty.e("GridObject").color("#7f0000").setPos({x: 11, y: 12}),
            Crafty.e("GridObject").color("#7f0000").setPos({x: 14, y:  9}),
            Crafty.e("GridObject").color("#7f0000").setPos({x: 21, y:  5}),
            Crafty.e("GridObject").color("#7f0000").setPos({x: 17, y: 13}),
            Crafty.e("GridObject").color("#7f0000").setPos({x:  2, y: 13}),
            Crafty.e("GridObject").color("#7f0000").setPos({x:  2, y:  9}),
        ];

        var player1 = Crafty.e("PlayerControllable")
                .setPos({x: 5, y: 3})
                .setColors(
                    {
                        defaultColor:     "#007000",
                        highlightedColor: "#00bf00",
                    });
        Crafty.e("PlayerControllable")
                .setPos({x: 7, y: 3})
                .setColors(
                    {
                        defaultColor:     "#000070",
                        highlightedColor: "#0000bf",
                    });
        Crafty.e("PlayerControllable")
                .setPos({x: 7, y: 5})
                .setColors(
                    {
                        defaultColor:     "#007070",
                        highlightedColor: "#00bfbf",
                    });
        Crafty.e("PlayerControllable")
                .setPos({x: 5, y: 5})
                .setColors(
                    {
                        defaultColor:     "#700070",
                        highlightedColor: "#bf00bf",
                    });

        Crafty("PlayerControllable").each(function() {
            readyCharacters.push(this);
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
        // TODO: Magic numbers bad
        // 120 is slightly more than the width of a button
        // ...or, button width is 120 minus half the padding.
        Crafty.e("2D, UILayer, Color, Mouse")
                .attr({x: 0, y: 0, w: 120, h: Game.height()})
                .color("#eee");

        // Animate centering the viewport over the player, taking 1500ms to do
        // it. Then, once the animation is done, set the viewport to follow the
        // player (with offset (0, 0)).
        Crafty.viewport.clampToEntities = false;
        Crafty.one("CameraAnimationDone", function() {
            // TODO magic numbers bad
            // 50 is half the width of the side pane
            Crafty.viewport.follow(player1, 60, 0);
        });
        // TODO: We need our own function for this that adds in the right
        // offset, so there isn't a sudden jump. The library implementation is
        // Crafty/viewport.js#L324-L335.
        Crafty.viewport.centerOn(player1, 1500);
        Crafty.bind("WorldClick", function(evt) {
            worldClickHandler(evt);
        });
    },
};
