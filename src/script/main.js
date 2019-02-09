/* global Crafty */

"use strict";
import "./button.js";

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
var StateEnum = Object.freeze({
    DEFAULT:         {},
    PLAYER_SELECTED: {},
    PLAYER_MOVE:     {},
    PLAYER_SWAP:     {},
    PLAYER_ATTACK:   {},
});

var globalState = StateEnum.DEFAULT;
var selectedPlayer;
var enemies;


///////////////////////////////////////////////////////////////////////////////
// Menu-related functions (and some misc?)

function reportUserError(text) {
    // TODO: Put this somewhere the user will actually see it.
    Crafty.error(text);
}

function selectPlayer(player) {
    deselectPlayer();
    selectedPlayer = player;
    selectedPlayer.highlight();
}

function removeMovementSquares() {
    Crafty("MovementSquare").each(function() {
        this.destroy();
    });
}

function deselectPlayer() {
    if (selectedPlayer && selectedPlayer.isHighlighted()) {
        selectedPlayer.unhighlight();
        selectedPlayer = null;
    }
}

// Note: player here is really the player _character_.
function doTopLevelActionMenu(player) {
    Crafty.log("Creating top-level action menu");
    globalState = StateEnum.PLAYER_SELECTED;
    Crafty.s("ButtonMenu").setTopLevelMenu("Select Action", [
        ["Move", () => doMoveMenu(player)],
        ["Swap places", () => doSwapPlacesMenu(player)],
        ["Attack", () => doAttackMenu(player)],
        ["Cancel", () => {
            Crafty.s("ButtonMenu").clearMenu();
            globalState = StateEnum.DEFAULT;
            deselectPlayer();
        }],
    ]);
}

function doMoveMenu(player) {
    globalState = StateEnum.PLAYER_MOVE;
    createMovementGrid(player);
    Crafty.s("ButtonMenu").pushMenu("Moving", [
        ["Back", () => Crafty.s("ButtonMenu").popMenu()],
    ]);
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

function doSwapPlacesMenu(player) {
    globalState = StateEnum.PLAYER_SWAP;
    Crafty.s("ButtonMenu").pushMenu("Swap Places", [
        ["Back", () => Crafty.s("ButtonMenu").popMenu()],
    ]);
}

function doAttackMenu(player) {
    globalState = StateEnum.PLAYER_ATTACK;
    Crafty.s("ButtonMenu").pushMenu("Attack", [
        ["Attack", () => doRegularAttackMenu(player)],
        ["Special Attack", () => {
            specialAttack(player);
            Crafty.s("ButtonMenu").clearMenu();
            globalState = StateEnum.DEFAULT;
            deselectPlayer();
        }],
        ["Back", () => Crafty.s("ButtonMenu").popMenu()],
    ]);
}

function doRegularAttackMenu(player) {
    globalState = StateEnum.PLAYER_ATTACK;
    Crafty.s("ButtonMenu").pushMenu("Regular Attack", [
        ["Back", () => Crafty.s("ButtonMenu").popMenu()],
    ]);
}

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
        this.color("#00FFFF", 0.5);
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
// Action handlers

function doSelectPlayer(evt, x, y) {
    // assert(globalState === StateEnum.DEFAULT ||
    //        globalState === StateEnum.PLAYER_SELECTED);

    if (evt.target && evt.target.has("PlayerControllable")) {
        doTopLevelActionMenu(evt.target);
        selectPlayer(evt.target);
    }
}

function doAutoPlayerAction(evt, x, y) {
    if (evt.target && evt.target.has("PlayerControllable")) {
        doSelectPlayer(evt, x, y);
    } else {
        doMove(evt, x, y);
    }
}

function doMove(evt, x, y) {
    // assert(globalState === StateEnum.PLAYER_MOVE ||
    //        globalState === StateEnum.PLAYER_SELECTED);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        Crafty.error("No player selected.");
        return;
    }

    // TODO: MovementSquares shouldn't be SpaceFillingObjects.
    if (evt.target && evt.target.has("SpaceFillingObject") &&
            !evt.target.has("MovementSquare")) {
        reportUserError("Can't move there; something's in the way.");
        return;
    } else if (!(evt.target && evt.target.has("MovementSquare"))) {
        reportUserError("Invalid destination (out of range?).");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu();
    globalState = StateEnum.DEFAULT;
    removeMovementSquares();
    selectedPlayer.animateTo({x: x, y: y});
    selectedPlayer.one("TweenEnd", function() { deselectPlayer(); });
}

function doSwap(evt, x, y) {
    // assert(globalState === StateEnum.PLAYER_SWAP);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        Crafty.error("No player selected.");
        return;
    }

    if (evt.target === null) {
        reportUserError("There's nothing there to swap with.");
        return;
    } else if (!evt.target.has("PlayerControllable")) {
        reportUserError("Can't swap with non-player.");
        return;
    } if (evt.target === selectedPlayer) {
        reportUserError("Cannot swap player with self.");
        return;
    }

    // Swap positions of clicked player and selectedPlayer.
    Crafty.s("ButtonMenu").clearMenu();
    globalState = StateEnum.DEFAULT;

    let selectPos = selectedPlayer.getPos();
    let clickPos  = evt.target.getPos();
    evt.target.animateTo(selectPos);
    selectedPlayer.animateTo(clickPos);
    selectedPlayer.one("TweenEnd", function() { deselectPlayer(); });
}

function doAttack(evt, x, y) {
    // assert(globalState === StateEnum.PLAYER_ATTACK);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        return;
    }

    if (evt.target === null) {
        reportUserError("No enemy there.");
        return;
    } else if (Math.abs(selectedPlayer.getPos().x - x) > 1 ||
            Math.abs(selectedPlayer.getPos().y - y) > 1) {
        reportUserError("Target not adjacent.");
        return;
    } else if (evt.target.has("PlayerControllable")) {
        reportUserError("Can't attack friendly unit.");
        return;
    }

    for (var i = 0; i < enemies.length; i++) {
        if (evt.target === enemies[i]) {
            enemies.splice(i, 1);
            break;
        }
    }
    // assert(we actually found it in the enemies list);
    // TODO - In fact, the above may not be true. Right now you can attack
    // MovementSquares. :/
    evt.target.destroy();
    Crafty.s("ButtonMenu").clearMenu();
    globalState = StateEnum.DEFAULT;
    deselectPlayer();
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
                .setPos({x: 6, y: 3})
                .setColors(
                    {
                        defaultColor:     "#000070",
                        highlightedColor: "#0000bf",
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

        // Convert regular mouse events to WorldClick events, so we can handle
        // that case without doing weird things when the player clicks on the
        // UI pane.
        Crafty.s("Mouse").bind("MouseUp", function(e) {
            // HACK: I can get the world position using [e.realX, e.realY], but
            // I can't find a way to get the screen position directly. So
            // manually do the viewport calculation to transform it.
            let worldX = e.realX;
            let viewRect = Crafty.viewport.rect();
            let screenX = (worldX - viewRect._x) * Game.width() / viewRect._w;

            // TODO: Magic numbers bad
            // 120 is the width of the UI pane.
            if (screenX >= 120) {
                Crafty.trigger("WorldClick", e);
            }
        });

        ///////////////////////////////////////////////////////////////////////

        // Generic handler for clicks on the world view.
        Crafty.bind("WorldClick", function(evt) {
            let x = Math.floor(evt.realX / Game.mapGrid.tile.width);
            let y = Math.floor(evt.realY / Game.mapGrid.tile.height);
            if (evt.mouseButton === Crafty.mouseButtons.LEFT) {
                Crafty.log(`You clicked at: (${x}, ${y})`);
                if (globalState === StateEnum.DEFAULT) {
                    doSelectPlayer(evt, x, y);
                } else if (globalState === StateEnum.PLAYER_SELECTED) {
                    doAutoPlayerAction(evt, x, y);
                } else if (globalState === StateEnum.PLAYER_MOVE) {
                    doMove(evt, x, y);
                } else if (globalState === StateEnum.PLAYER_SWAP) {
                    doSwap(evt, x, y);
                } else if (globalState === StateEnum.PLAYER_ATTACK) {
                    doAttack(evt, x, y);
                } else {
                    Crafty.error("Unknown state value.");
                    // assert(false);
                }
            } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
                Crafty.log("AAAAAAAAAA");
            }
        });

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
    },
};
