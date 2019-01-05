"use strict";
import './button.js'

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
var StateEnum = Object.freeze({
    DEFAULT: {},
    PLAYER_SELECTED: {},
    PLAYER_MOVE: {},
});

var GlobalState = StateEnum.DEFAULT;
var selectedPlayer;

function createPlayerSelectMenu(player) {
    Crafty.log("Creating Player Select Menu")
    Crafty.s("ButtonMenu").setButtons([
        Crafty.e("MyButton, UILayer")
                .attr({x: 10, y: 10, w: 100, h: 20})
                .text("Move")
                .onclick(() => {
                    GlobalState = StateEnum.PLAYER_MOVE;
                }),
        Crafty.e("MyButton, UILayer")
                .attr({x: 10, y: 35, w: 100, h: 20})
                .text("Cancel")
                .onclick(() => {
                    Crafty.s("ButtonMenu").clearButtons();
                    GlobalState = StateEnum.DEFAULT;
                    player.unhighlight();
                })
        ]);
    }

// Component for anything that occupies a grid space.
Crafty.c("GridObject", {
    required: "2D, DOM, Color, Tween",
    init: function() {
        this.attr({w: Game.mapGrid.tile.width, h: Game.mapGrid.tile.height});
        // Put us at (0, 0) by default just to ensure that _tileX and _tileY
        // are not undefined. Hopefully the caller will immediately move us to
        // a real position.
        this.setPos({x: 0, y: 0});
    },

    // Get and set the position in map-grid tiles (not pixels).
    getPos: function() {
        return {x:this._tileX, y:this._tileY};
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
            x:      newPos.x * Game.mapGrid.tile.width,
            y:      newPos.y * Game.mapGrid.tile.height,
        }, 200);
        // So that "setter" attributes can be chained together.
        return this;
    },
});

Crafty.c("PlayerControllable", {
    required: "GridObject, Keyboard, Mouse",
    init: function() {
        this.bind('KeyDown', function(e) {
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
        this.color(this._defaultColor)
        // So that "setter" attributes can be chained together.
        return this;
    },

    highlight: function() {
        this._isHighlighted = true;
        return this.color(this._highlightedColor);
    },
    unhighlight: function() {
        // TODO HACK: What color were we originally?
        this._isHighlighted = false;
        return this.color(this._defaultColor);
    },
    isHighlighted: function() {
        return this._isHighlighted;
    }
});

export let Game = {
    mapGrid: {
        width: 25,
        height: 17,
        tile: {
            width: 16,
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
                        map: {
                            // TODO better name
                            anim_start: [0, 0],
                        }
                    }
                }
            },
            function() {
                Crafty.e("2D, DOM, anim_start, SpriteAnimation")
                    .attr({x: 48, y: -32, w: 32, h: 32})
                    .reel("my_animation", 1000, [
                        [0, 0], [1, 0], [2, 0], [3, 0]
                    ])
                    .animate("my_animation", -1);
            }
        );

        // Random static objects
        Crafty.e("GridObject").color("#7f0000").setPos({x: 17, y:  9});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 11, y:  3});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 19, y: 11});
        Crafty.e("GridObject").color("#7f0000").setPos({x:  8, y: 11});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 11, y: 12});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 14, y:  9});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 21, y:  5});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 17, y: 13});
        Crafty.e("GridObject").color("#7f0000").setPos({x:  2, y: 13});
        Crafty.e("GridObject").color("#7f0000").setPos({x:  2, y:  9});

        var player1 = Crafty.e("PlayerControllable")
            .setPos({x: 5, y: 3})
            .setColors(
                {
                    defaultColor: "#007000",
                    highlightedColor: "#00bf00",
                });
        var player2 = Crafty.e("PlayerControllable")
            .setPos({x: 6, y: 3})
            .setColors(
                {
                    defaultColor: "#000070",
                    highlightedColor: "#0000bf",
                });

        // Take 2
        Crafty.createLayer("UILayer", "DOM", {
            // Ignore viewscreen transforms
            xResponse: 0,
            yResponse: 0,
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
        Crafty.bind("WorldClick", function(e) {
            if (e.mouseButton === Crafty.mouseButtons.LEFT) {
                if(e.target &&  e.target.has("PlayerControllable")){
                    var player = e.target;
                    player.highlight();
                    if (GlobalState === StateEnum.DEFAULT) {
                        createPlayerSelectMenu(player);
                        GlobalState = StateEnum.PLAYER_SELECTED;
                        selectedPlayer = player;
                    }
                    Crafty.log("You clicked on the player.");
                } else {
                    let x = Math.floor(e.realX / Game.mapGrid.tile.width);
                    let y = Math.floor(e.realY / Game.mapGrid.tile.height);
                    Crafty.log(`You clicked at: (${x}, ${y})`);
                    if (selectedPlayer && 
                            GlobalState === StateEnum.PLAYER_MOVE ||
                            GlobalState === StateEnum.PLAYER_SELECTED) {
                        Crafty.s("ButtonMenu").clearButtons();
                        selectedPlayer.animateTo({x: x, y: y});
                        selectedPlayer.one("TweenEnd", function() {
                            selectedPlayer.unhighlight();
                        });
                        GlobalState = StateEnum.DEFAULT;
                    }
                }
            } else if (e.mouseButton === Crafty.mouseButtons.RIGHT) {
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
