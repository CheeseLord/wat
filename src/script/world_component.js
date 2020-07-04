/* global Crafty */

"use strict";

import {
    SPRITE_DUR_PER_FRAME,
    ClickEnum,
    TILE_HEIGHT,
    TILE_WIDTH,
    Z_CHARACTER,
    Z_GROUND,
    Z_SCENERY,
    Z_WORLD_UI,
} from  "./consts.js";

import {
    gridPosToGraphics,
} from "./geometry.js";

import {
    hoverHighlightAction,
    clearHoverHighlights,
} from "./highlight.js";

import {
    assert,
    userMessage,
} from "./message.js";

import {
    state,
} from "./state.js";

import {
    getProportion,
} from "./util.js";

///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that is located in a grid space.
// Don't inherit from GridObject directly; use StaticObject or DynamicObject!
Crafty.c("GridObject", {
    required: "2D, Mouse",

    init: function() {
        this.attr({w: TILE_WIDTH, h: TILE_HEIGHT});
        this.attr({blocksMovement: false});

        this.autoAction = null;

        // Highlighting
        this._bgColor          = null;
        this._defaultHighlight = null;
        this._hoverHighlight   = null;
        this._animHighlight    = null;
    },

    events: {
        "MouseOver": function() {
            // TODO hover-highlight in other states (but only for actions that
            // would actually be performed).
            // TODO: Move this logic... somewhere else. Seems like maybe a UI
            // question to me.
            if (state.clickType === ClickEnum.CHARACTER_SELECTED) {
                hoverHighlightAction(this.autoAction);
            }
        },
        "MouseOut":  function() { clearHoverHighlights();  },
    },

    // Initially set the position in map-grid tiles (not pixels). Don't call
    // this after the object has been initialized! gridPos is something like
    // {x: ..., y: ...}
    initPos: function(gridPos) {
        this.attr({_tileX: gridPos.x, _tileY: gridPos.y});
        this.attr(gridPosToGraphics(gridPos));
        return this;
    },

    // Get current position in map-grid tiles.
    getPos: function() {
        return {x: this._tileX, y: this._tileY};
    },

    ////////////////////////////////////////
    // Highlighting stuff

    setBgColor: function(color) {
        this._bgColor = color;
        this._redraw();
        return this;
    },
    setDefaultHighlight: function(color) {
        this._defaultHighlight = color;
        this._redraw();
        return this;
    },
    setHoverHighlight: function(color) {
        this._hoverHighlight = color;
        this._redraw();
        return this;
    },
    setAnimHighlight: function(color) {
        this._animHighlight = color;
        this._redraw();
        return this;
    },
    clearDefaultHighlight: function() {
        return this.setDefaultHighlight(null);
    },
    clearHoverHighlight: function() {
        return this.setHoverHighlight(null);
    },
    clearAnimHighlight: function() {
        return this.setAnimHighlight(null);
    },
    clearAllHighlights: function() {
        this.clearDefaultHighlight();
        this.clearHoverHighlight();
        this.clearAnimHighlight();
        return this._redraw();
    },

    _redraw: function() {
        // Find the first highlight category which is set.
        let hlColor = null;
        let hlToTry = [
            this._animHighlight,
            this._hoverHighlight,
            this._defaultHighlight,
        ];
        for (let i = 0; i < hlToTry.length; i++) {
            if (hlToTry[i] !== null) {
                hlColor = hlToTry[i];
                break;
            }
        }

        if (hlColor !== null)  {
            return this._setHighlight(hlColor);
        } else {
            // No highlight set.
            return this._clearHighlight();
        }
    },
});

// Component for things that never change state in any way.
Crafty.c("StaticObject", {
    required: "GridObject, Canvas",

    init: function() {
        this._finalized       = false;
        this._highlightColor  = null;
        this._highlightEntity = null;
    },

    finalize: function() {
        this._finalized = true;
        this._redraw();
    },

    _setHighlight: function(color) {
        if (!this._finalized) {
            // If we're still being moved into position, don't try to redraw
            // since that would mess up the optimization below.
            assert(this._highlightColor === null);
            return this;
        }
        if (color === this._highlightColor) {
            // Optimization: if not changing the color, don't destroy/recreate
            // entities.
            return this;
        }
        this._highlightColor = color;
        if (this._highlightEntity !== null) {
            this._highlightEntity.destroy();
        }
        if (color === null) {
            this._highlightEntity = null;
            return this;
        }
        if (color.length > 7) {
            // Strip alpha channel, since having an alpha channel was causing
            // all Canvas highlights to show as black (not sure why).
            color = color.substring(0, 7);
        }
        // Since we're finalized, we should have a properly initialized z.
        assert(this.z > 0);
        this._highlightEntity = Crafty.e("2D, Canvas, Color")
                .color(color)
                .attr({
                    x: this.x,
                    y: this.y,
                    w: this.w,
                    h: this.h,
                    // Force the highlight to be just behind us. Bit of a hack.
                    z: this.z - 1,
                });
        // We could do this:
        //     this.attach(this._highlightEntity);
        // But it doesn't matter because we won't ever move.
        return this;
    },
    _clearHighlight: function() {
        return this._setHighlight(this._bgColor);
    },
});

// Component for things that might change state.
Crafty.c("DynamicObject", {
    required: "GridObject, DOM, Tween",

    init: function() {
        this.attr({blocksMovement: true});
    },

    // Move the object to a new position, animating it smoothly. gridPos is in
    // map-grid tiles, in the form {x: ..., y: ...}
    animateTo: function(gridPos, duration) {
        // TODO: Wait to update _tile{X,Y} until after the animation completes?
        this.attr({_tileX: gridPos.x, _tileY: gridPos.y});
        this.tween(gridPosToGraphics(gridPos), duration);
        return this;
    },

    _setHighlight: function(color) {
        return this.css({
            "background-color": color,
        });
    },
    _clearHighlight: function() {
        return this.css({
            "background-color": this._bgColor,
        });
    },
});

Crafty.c("Health", {
    required: "DynamicObject",

    init: function() {
        this._setupHealthBar();
        this.maxHealth(1);
    },

    _setupHealthBar: function() {
        let x = Math.round(this.x + (this.w / 8));
        let y = Math.round(this.y + (6 * this.h / 8));
        let w = Math.round(this.w * 6 / 8);
        let h = Math.round(this.h * 1 / 8);

        // TODO Magic colors etc.
        // TODO Better way to have a few stacked z levels that are conceptually
        // in a single layer
        this.healthBarTotWidth_ = w;
        // Terrible hack to work around a rounding error which I suspect has to
        // do with this.attach. Sometimes the foreground bar was showing up one
        // pixel to the left of where it should be, for no obvious reason.
        // Other times the background was. So shift both to the right by a
        // small fraction of a pixel, so that whatever imprecise calculation is
        // going on under the hood can't wind up with a value that's very very
        // slightly less than an integer. Sigh.
        //
        // TODO If they're really truncating to integers under the hood, maybe
        // we should just shift everything 0.5 pixels over? Might "solve" other
        // cases of this problem as well.
        this.healthBarBackground_ = Crafty.e("2D, DOM, Color")
                .color("#800000")
                .attr({
                    x: x - 1 + 0.01,
                    y: y - 1 + 0.01,
                    w: w + 2,
                    h: h + 2,
                    z: Z_WORLD_UI,
                });
        this.healthBarForeground_ = Crafty.e("2D, DOM, Color")
                .color("#008000")
                .attr({
                    x: x + 0.01,
                    y: y + 0.01,
                    w: w,
                    h: h,
                    z: Z_WORLD_UI + 1,
                });
        this.healthBarBackground_.css({
            "box-sizing": "border-box",
            "border":     "1px solid white",
        });
        this.attach(this.healthBarBackground_);
        this.attach(this.healthBarForeground_);
    },

    _updateHealthBar: function() {
        let healthFrac = getProportion(this.health_, this.maxHealth_);
        let newW = this.healthBarTotWidth_ * healthFrac;
        this.healthBarForeground_.attr({w: newW});
    },

    // Set the initial health of the object.
    maxHealth: function(health) {
        this.maxHealth_ = health;
        this.health_    = health;
        this._updateHealthBar();
        return this;
    },

    setHealth: function(health) {
        this.health = health;
        this._updateHealthBar();
        return this;
    },

    takeDamage: function(damage) {
        this.health_ -= damage;
        if (this.health_ <= 0) {
            this.destroy();
        } else {
            this._updateHealthBar();
        }
        return this;
    },
});

Crafty.c("Name", {
    required: "DynamicObject",

    init: function() {
        this._setupName();
        this.setName_("Steve");
    },

    setName_: function(name) {
        this.name_ = name;
        this._nameText.text(name);
        return this;
    },

    _setupName: function() {
        this._nameBackground = Crafty.e("2D, DOM, Color")
                .css({"background-color": "#ffffff88"});
        // TODO: Fix Magic numbers
        this._nameBackground.attr({
            z: Z_WORLD_UI - 1,
            w: 100, // this seems to work, but we may want this to be dynamic
            h: 16, // this seems to work
            x: (-100 + 32) / 2, // (-w + cell_size)/2
            y: -16, // (- cell_size)/2
        });
        this._nameText = Crafty.e("2D, DOM, Text");
        this._nameText.attr({
            z: Z_WORLD_UI,
            w: 100,
            x: (-100) / 2 + 16,
            y: -16,

        });
        this._nameText.textColor("#000000");
        this._nameText.textAlign("center");
        this.attach(this._nameBackground);
        this._nameBackground.attach(this._nameText);
    },
});

Crafty.c("Character", {
    required: "DynamicObject, Health, Name",

    init: function() {
        this.attr({
            actionPoints:     0,
            availableActions: [],
            defaultAttack:    null,
            speed:            4,
            team:             -1,
            z:                Z_CHARACTER,
        });
        // inherit blocksMovement=true from DynamicObject
    },

    setSpeed: function(speed) {
        this.speed = speed;
        return this;
    },

    setTeam: function(team) {
        this.team = team;
        return this;
    },

    setActions: function(defaultAttack, actions) {
        assert(defaultAttack.isTargeted());
        this.defaultAttack    = defaultAttack;
        this.availableActions = [defaultAttack].concat(actions);
        return this;
    },

    readyActions: function() {
        this.actionPoints = this.speed;
    },
});

Crafty.c("SpriteCharacter", {
    required: "Character, SpriteAnimation",

    setAnimation: function(row, count) {
        let frames = [];
        for (let x = 0; x < count; x++) {
            frames.push([x, row]);
        }
        this.reel("my_animation", count * SPRITE_DUR_PER_FRAME, frames);
        this.animate("my_animation", -1);
        return this;
    },
});

// Note: don't check for this directly. This is just a convenience alias for
// Characters on an "other" team that don't move.
Crafty.c("Enemy", {
    // TODO: Specify enemy_anim_start when creating these, not in the class
    // itself. (And then probably also do the setAnimation call there as well.)
    required: "SpriteCharacter, enemy_anim_start",

    init: function() {
        // For now, all Enemies have the same animation.
        this.setAnimation(0, 4);
        // Enemies don't move for now.
        this.setTeam(-1);
    },
});

Crafty.c("Ground", {
    required: "StaticObject, ground_anim",

    init: function() {
        this.setBgColor("#764e00");
        this.attr({z: Z_GROUND});
    },
});

Crafty.c("Tree", {
    required: "StaticObject, tree_anim",

    init: function() {
        this.attr({z: Z_SCENERY});
        this.attr({blocksMovement: true});
    },
});

Crafty.c("Door", {
    required: "DynamicObject, SpriteAnimation, closed_door",

    init: function() {
        this.attr({z: Z_SCENERY});
        this.attr({blocksMovement: true});
        this.reel("closed_door", SPRITE_DUR_PER_FRAME, [[0, 0]]);
        this.reel("open_door", SPRITE_DUR_PER_FRAME, [[1, 0]]);
        this.setClosed();
    },

    toggleOpen: function() {
        if (this.isOpen) {
            this.setClosed();
        } else {
            this.setOpen();
        }
    },

    setOpen: function() {
        this.animate("open_door", -1);
        this.attr({isOpen: true, blocksMovement: false});
    },

    setClosed: function() {
        this.animate("closed_door", -1);
        this.attr({isOpen: false, blocksMovement: true});
    },
});

Crafty.c("Interactable", {
    required: "DynamicObject",

    init: function() {
        this.attr({idString: null});
    },

    setIdString: function(string) {
        this.attr({idString: string});
    },

    interact: function(user) {
        // Subclasses can optionally define an onInteract() method, which will
        // be called whenever they are interacted with.
        if (this.onInteract !== undefined) {
            this.onInteract(user);
        }
        let evtData = {
            idString: this.idString,
            // TODO better names for these two.
            subject:  user,
            target:   this,
        };
        Crafty.trigger("Interact", evtData);
    },
});

Crafty.c("Lever", {
    required: "Interactable, SpriteAnimation, unpulled_lever",

    init: function() {
        this.attr({z: Z_SCENERY});
        this.attr({blocksMovement: true});
        this.reel("unpulled_lever", SPRITE_DUR_PER_FRAME, [[0, 0]]);
        this.reel("pulled_lever",   SPRITE_DUR_PER_FRAME, [[1, 0]]);
        this.setUnpulled();
    },

    onInteract: function(user) {
        userMessage(`${user.name_} pulled a lever.`);
        this.togglePulled();
    },

    togglePulled: function() {
        if (this.isPulled) {
            this.setUnpulled();
        } else {
            this.setPulled();
        }
    },
    setUnpulled: function() {
        this.animate("unpulled_lever", -1);
        this.attr({isPulled: false});
    },
    setPulled: function() {
        this.animate("pulled_lever", -1);
        this.attr({isPulled: true});
    },
});

