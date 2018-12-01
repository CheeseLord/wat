Crafty.s("ButtonMenu", {
    init: function() {
        // _buttons is a list of MyButton objects that are being displayed.
        // If we aren't currently displaying buttons, _buttons is empty.
        this._buttons = [];
        // _focusIndex is the index of the button that is currently
        // focus()ed, or -1 if no button is focused.
        this._focusIndex = -1;
        this.bind('KeyDown', this.onKeyPress);

        // Un-active every MyButton when the mouse is released, regardless of
        // whether the mouse is actually over that button.
        Crafty.s("Mouse").bind("MouseUp", function(evt) {
            Crafty("MyButton").each(function(_index) {
                // 'this' is the current entity of the iteration; our parameter
                // is the index.
                this.unactive();
            });
        });
    },

    // Set the current menu to the specified list of buttons. Overrides any
    // previous menu; there can only be one menu at a time. (If that becomes a
    // problem, we should probably just convert this to a Menu entity, rather
    // than a subsystem.)
    setButtons: function(buttonList) {
        this.clearButtons();
        this._buttons = buttonList;
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i].index = i;
        }
    },

    // Stop tracking buttons.
    clearButtons: function() {
        if (0 <= this._focusIndex && this._focusIndex < this._buttons.length) {
            this._buttons[this._focusIndex].unfocus();
        }
        this._buttons    = [];
        this._focusIndex = -1;
    },

    onKeyPress: function(e) {
        if (e.key === Crafty.keys.UP_ARROW) {
            this.moveFocus(-1);
        } else if (e.key === Crafty.keys.DOWN_ARROW) {
            this.moveFocus(+1);
        } else if (e.key === Crafty.keys.ENTER) {
            // TODO: Call whichever function handles clicks.
            Crafty.log(`Clicked button ${this._focusIndex}`);
        }
    },

    // Move the focus <delta> buttons forward, wrapping around. If <delta> is
    // negative, move backward.
    moveFocus: function(delta) {
        let newIndex;
        if (this._focusIndex < 0) {
            // No focused button. Count either forward from start or backward
            // from end, depending on the direction of motion. Really delta
            // should be +1 or -1, so most of this complexity is probably
            // unnecessary...
            if (delta > 0) {
                newIndex = delta - 1;
            } else if (delta < 0) {
                newIndex = Math.max(0, this._buttons.length + delta);
            } else {
                // Uh... this probably shouldn't happen. Let's just go with the
                // first button?
                newIndex = 0;
            }
        } else {
            newIndex = (this._focusIndex + delta) % this._buttons.length;
            if (newIndex < 0)
                newIndex += this._buttons.length;
        }
        this.setFocus(newIndex);
    },

    setFocus: function(newIndex) {
        if (0 <= this._focusIndex && this._focusIndex < this._buttons.length) {
            this._buttons[this._focusIndex].unfocus();
        }
        this._focusIndex = newIndex;
        if (0 <= this._focusIndex && this._focusIndex < this._buttons.length) {
            this._buttons[this._focusIndex].focus();
        }
    },
});

Crafty.c("MyButton", {
    required: "2D, DOM, Color, Button, Text",
    init: function() {
        this.attr({
            _focus:  false,
            _hover:  false,
            _active: false,
            index: -1,
        });
        this.css({
            "transition": "50ms all linear"
        });
        this.bind("MouseOver", this.hover)
            .bind("MouseOut",  this.unhover)
            .bind("MouseDown", this.active)
            .bind("MouseUp", this.click);
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
        Crafty.s("ButtonMenu").setFocus(this.index);
        this.attr({_active: true});
        this._redraw();
    },
    unactive: function() {
        this.attr({_active: false});
        this._redraw();
    },
    click: function() {
        Crafty.log(`Clicked button ${this.index}`);
    },

    // Internal helper for when the state is (or might be) changed.
    _redraw: function() {
        this.css({
            "cursor": "pointer",
            "border": "none",
            "border-radius": "0%",
            "box-shadow": "none",
            "text-decoration": "none",
            "box-sizing": "border-box",
        });
        let newColor = "#";
        if (this._focus) {
            this.css({
                "border-radius": "25%",
                "border": "2px solid green",
            });
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
            this.css({
                "border": "1px solid #555555",
                "box-shadow": "1px 1px 2px #aaaaaa",
                "text-decoration": "none",
            });
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

        // Take 2
        Crafty.createLayer("UILayer", "DOM", {
            // Ignore viewscreen transforms
            xResponse: 0,
            yResponse: 0,
            scaleResponse: 0,
            // On top of other layers
            z: 40
        });

        let thing = Crafty.e("MyButton, UILayer")
            .attr({x: 200, y: 100, w: 100, h: 25})
            .color("#eeddcc")
            .text("Demo Button");

        {
            let buttonList = [];
            // Create a "cube" of buttons to show off the styles.
            for (let a = 0; a <= 1; a++) {
                for (let h = 0; h <= 1; h++) {
                    for (let f = 0; f <= 1; f++) {
                        let x =  20 + 80*h + 30*a;
                        let y = 100 + 80*f + 30*a;
                        let theButton = Crafty.e("MyButton, UILayer")
                            .attr({x: x, y: y, w: 20, h: 20});
                        let text = "";
                        if (f) {
                            theButton.focus();
                            text += "F";
                        } else {
                            text += "f";
                        }
                        if (h) {
                            theButton.hover();
                            text += "H";
                        } else {
                            text += "h";
                        }
                        if (a) {
                            theButton.active();
                            text += "A";
                        } else {
                            text += "a";
                        }
                        theButton.text(text);
                        buttonList.push(theButton);
                    }
                }
            }

            Crafty.s("ButtonMenu").setButtons(buttonList);
        }

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

