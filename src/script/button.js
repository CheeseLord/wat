"use strict";

Crafty.s("ButtonMenu", {
    init: function() {
        // _buttons is a list of MyButton objects that are being displayed.
        // If we aren't currently displaying buttons, _buttons is empty.
        this._buttons = [];
        // _focusIndex is the index of the button that is currently
        // focus()ed, or -1 if no button is focused.
        this._focusIndex = -1;
        // _activeButton points to the currently active button, or null if no
        // button is active.
        this._activeButton = null;

        this.bind('KeyDown', this.onKeyPress);

        // Note: we need to bind to anonymous wrapper functions because
        // callbacks are called in the context of the Mouse subsystem, but the
        // actual handler functions need to be called in ButtonMenu's context.
        Crafty.s("Mouse").bind("MouseDown", function(evt) {
            Crafty.s("ButtonMenu").onMouseDown(evt);
        });
        Crafty.s("Mouse").bind("MouseUp", function(evt) {
            Crafty.s("ButtonMenu").onMouseUp(evt);
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

    onMouseDown: function(evt) {
        // This probably only matters in weird edge cases; normally we do this
        // on MouseUp.
        this.clearActive();
        if (evt.target !== null && evt.target.isMyButton &&
                evt.target.index >= 0) {
            // This MouseDown is on a button that we are aware of.
            this.makeActive(evt.target);
        }
    },

    onMouseUp: function(evt) {
        if (this._activeButton !== null) {
            if (evt.target === this._activeButton) {
                this._activeButton.click();
            }
        }
        this.clearActive();
    },

    makeActive: function(button) {
        this._activeButton = button;
        this._activeButton.active();
    },
    clearActive: function() {
        if (this._activeButton !== null) {
            this._activeButton.unactive();
            this._activeButton = null;
        }
    },

    onKeyPress: function(e) {
        if (e.key === Crafty.keys.UP_ARROW) {
            this.moveFocus(-1);
        } else if (e.key === Crafty.keys.DOWN_ARROW) {
            this.moveFocus(+1);
        } else if (e.key === Crafty.keys.ENTER) {
            if (0 <= this._focusIndex &&
                     this._focusIndex < this._buttons.length) {
                this._buttons[this._focusIndex].click();
            }
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
            isMyButton: true,
            _focus:  false,
            _hover:  false,
            _active: false,
            _onclick: undefined,
            index: -1,
        });
        this.css({
            "transition": "50ms all linear"
        });
        this._redraw();
    },

    events: {
        // Note that that we need anonymous functions as these events need to
        // be defined when the events are handled.
        "MouseOver": function() {this.hover()},
        "MouseOut":  function() {this.unhover()},
    },

    // Mouse handlers call these functions to change the displayed state.
    // Do NOT change the button styles in these functions, since that
    // introduces dependencies on the order in which different bits are set.
    // Set all styles in _redraw instead.
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

    onclick: function(f) {
        this._onclick = f;
        return this;
    },
    click: function() {
        Crafty.log(`Clicked button ${this.index}`);
        if (this._onclick === undefined) {
            Crafty.error(`No handler defined for button ${this.index}`);
        } else {
            this._onclick();
        }
    },

    // Internal helper for when the state is (or might be) changed.
    _redraw: function() {
        // Focus: indicates which button will be selected if the user presses
        //     "enter".
        // Hover: indicates which button the mouse is currently over,
        //     regardless of whether the mouse button has been clicked.
        // Active: indicates the button that the user has MouseDown'ed on, when
        //     the user has not yet MouseUp'ed since then (and regardless of
        //     whether the mouse is still over the button).

        // Idea:
        //   - Default button: light bluish
        //   - Hovered but not active: slightly lighter bluish
        //   - Active and hovered: white text on dark blue
        //   - Active but not hovered: same as default
        //   - Focused: Add a green border (orthogonal to the above)

        this.css({
            "cursor":     "pointer",
            "box-sizing": "border-box",
            "box-shadow": "1px 1px 2px #7f7f7f",
        });

        let bgColor = "#007fff";
        let fgColor = "#000000";

        if (this._hover) {
            if (this._active) {
                bgColor = "#005fbf";
                fgColor = "#ffffff";
            } else {
                bgColor = "#00bfff";
            }
        }

        if (this._focus) {
            this.css({
                "border": "2px solid green",
            });
        } else {
            this.css({
                "border": "2px solid transparent",
            });
        }

        // If you call .text on a Text entity without calling .textColor, it
        // results in the following warning:
        //     Expected color but found 'undefined'
        // Furthermore:
        //   - Calling .textColor before .color sets the foreground and
        //     background colors separately, which is what we want.
        //   - Calling .color before .textColor results in BOTH being set to
        //     the textColor.
        // Therefore, we must set .textColor here, and we must do it before we
        // set .color.
        this.textColor(fgColor);
        this.color(bgColor);
        this.textAlign("center");
    },
});

