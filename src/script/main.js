Crafty.c("MyButton", {
    required: "2D, DOM, Color, Button",
    // TODO: Support text on the button.
    init: function() {
        this.attr({
            _focus:  false,
            _hover:  false,
            _active: false,
        });
        this._redraw();
    },

    // Mouse handlers call these functions to change the displayed state.
    focus:    function() {
        this.attr({_focus:  true});
        this._redraw();
    },
    unfocus:  function() {
        this.attr({_focus:  false});
        this._redraw();
    },
    hover:    function() {
        this.attr({_hover:  true});
        this._redraw();
    },
    unhover:  function() {
        this.attr({_hover:  false});
        this._redraw();
    },
    active:   function() {
        this.attr({_active: true});
        this._redraw();
    },
    unactive: function() {
        this.attr({_active: false});
        this._redraw();
    },

    // Internal helper for when the state is (or might be) changed.
    _redraw: function() {
        let newColor = "#";
        if (this._focus) {
            newColor += "ff";
        } else {
            newColor += "00";
        }
        if (this._hover) {
            newColor += "ff";
        } else {
            newColor += "00";
        }
        if (this._active) {
            newColor += "ff";
        } else {
            newColor += "00";
        }
        this.color(newColor);
    },
});

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

    highlight: function() {
        this._isHighlighted = true;
        return this.color("#00bf00");
    },
    unhighlight: function() {
        // TODO HACK: What color were we originally?
        this._isHighlighted = false;
        return this.color("#007f00");
    },
    isHighlighted: function() {
        return this._isHighlighted;
    }
});

Game = {
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

    // TODO: If you remove the static button, then when the dynamic button
    // first appears we only render the bottom few pixels until the user next
    // forces a redraw (or something like that). But if you include the static
    // button, the dynamic button seems to have no such problem. Wut?
    doStaticButton:   true,
    hasDynamicButton: false,

    start: function() {
        Crafty.init(Game.width(), Game.height(),
            document.getElementById("game"));
        Crafty.background("#ccc");

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

        var player = Crafty.e("PlayerControllable")
            .setPos({x: 5, y: 3})
            .color("#007f00");

        ///////////////////////////////////////////////////////////////////////
        // Just testing out a text-button...
        // Crafty.e("2D, DOM, Text, Button")
        //     .attr({x: 0, y: 0, w: 32, h: 32})
        //     .text("I'm here. Click me!")
        //     .unselectable()
        //     .bind("Click", function(e) {
        //         Crafty.log("I've been clicked!");
        //     });

        // Take 2
        Crafty.createLayer("UILayer", "DOM", {
            // Ignore viewscreen transforms
            xResponse: 0,
            yResponse: 0,
            scaleResponse: 0,
            // On top of other layers
            z: 40
        });

        if (Game.doStaticButton) {
            Crafty.e("2D, HTML, UILayer")
                .attr({x: 0, y: 0})
                .append("<button id='mystaticbutton' class='mybutton'>I'm " +
                        "here. Click me!</button>");
            var button = document.getElementById('mystaticbutton');
            button.onclick = function(e) {
                Crafty.log("Clicked static button");
            }
        }

        let thing = Crafty.e("MyButton, UILayer")
            .attr({x: 200, y: 100, w: 25, h: 25});
        thing.bind("MouseOver", thing.hover)
            .bind("MouseOut", function(e) {
                thing.unhover();
                thing.unactive();
            })
            .bind("MouseDown", thing.active)
            .bind("MouseUp", thing.unactive);
        // TODO: Handle keyboard.

        ///////////////////////////////////////////////////////////////////////

        // Temporary hack to log wherever you click.
        // Also moving player to clicked tile
        // Basically copied from:
        //     http://craftyjs.com/api/MouseSystem.html
        Crafty.s("Mouse").bind("MouseUp", function(e) {
            if (e.mouseButton === Crafty.mouseButtons.LEFT) {
                if (e.target === player){
                    player.highlight();
                    Crafty.log("You clicked on the player.");
                    if (!Game.hasDynamicButton) {
                        Crafty.e("2D, HTML, UILayer")
                            .attr({x: 300, y: 0})
                            .replace("<button id='mydynamicbutton' " +
                                    "class='mybutton'>I'm here. " +
                                    "Click me!</button>");
                        var button = document.getElementById(
                            'mydynamicbutton'
                        );
                        button.onclick = function(e) {
                            Crafty.log("Clicked dynamic button");
                        }
                        // Only create one dynamic button.
                        Game.hasDynamicButton = true;
                        // TODO: If you don't include the static button, then
                        // this button doesn't fully render. I would have
                        // thought this next line would fix it, but apparently
                        // not.
                        Crafty.viewport.reload();
                    }
                } else {
                    let x = Math.floor(e.realX / Game.mapGrid.tile.width);
                    let y = Math.floor(e.realY / Game.mapGrid.tile.height);
                    Crafty.log(`You clicked at: (${x}, ${y})`);
                    if (player.isHighlighted()) {
                        player.animateTo({x: x, y: y});
                        player.one("TweenEnd", function() {
                            player.unhighlight();
                        });
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
            Crafty.viewport.follow(player, 0, 0);
        });
        Crafty.viewport.centerOn(player, 1500);
    },
};

