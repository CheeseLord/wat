/* global Crafty */

"use strict";

import {
    MapGrid,
    HL_RADIUS,
    SPRITE_DUR_PER_FRAME,
    Z_CHARACTER,
    Z_GROUND,
    Z_SCENERY,
} from  "./consts.js";

import {
    gridPosToGraphics,
} from "./util.js";

///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that is located in a grid space.
// Don't inherit from GridObject directly; use StaticObject or DynamicObject!
Crafty.c("GridObject", {
    required: "2D, DOM",

    init: function() {
        this.attr({w: MapGrid.tile.width, h: MapGrid.tile.height});
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
});

// Anything that takes up space, in the sense that you can't have two of them
// on the same tile. Provides no new functionality, but the component is
// checked in movement code.
// TODO: Use a real bit.
Crafty.c("SpaceFillingObject", {
    required: "GridObject",
});

// Component for things that never change state in any way.
Crafty.c("StaticObject", {
    required: "GridObject",
});

// Component for things that might change state.
Crafty.c("DynamicObject", {
    required: "GridObject, Tween",

    // Move the object to a new position, animating it smoothly. gridPos is in
    // map-grid tiles, in the form {x: ..., y: ...}
    animateTo: function(gridPos, duration) {
        // TODO: Wait to update _tile{X,Y} until after the animation completes?
        this.attr({_tileX: gridPos.x, _tileY: gridPos.y});
        this.tween(gridPosToGraphics(gridPos), duration);
        return this;
    },
});

Crafty.c("Highlightable", {
    // TODO enforce that subclasses use DynamicObject or StaticObject.
    required: "GridObject",

    init: function() {
        this._isReady    = false;
        this._isSelected = false;
    },

    _setBorder: function(color) {
        return this.css({
            "outline": "solid " + (HL_RADIUS) + "px " + color,
        });
    },
    _clearBorder: function() {
        return this.css({
            "outline": "none",
        });
    },
    _redraw: function() {
        if (this._isSelected) {
            return this._setBorder("#ff9f00");
        } else if (this._isReady) {
            return this._setBorder("#1f3f9f");
        } else {
            return this._clearBorder();
        }
    },

    markSelected: function() {
        this._isSelected = true;
        return this._redraw();
    },
    markUnselected: function() {
        this._isSelected = false;
        return this._redraw();
    },
    // Note: if you don't like this name, at least don't change it to simply
    // "ready()". That name is already taken, so reusing it will cause things
    // to break horribly.
    markReady: function() {
        this._isReady = true;
        return this._redraw();
    },
    markUnready: function() {
        this._isReady = false;
        return this._redraw();
    },
});

Crafty.c("Character", {
    required: "DynamicObject, Highlightable, SpaceFillingObject, Mouse",

    init: function() {
        this.team = -1;
        this.attr({z: Z_CHARACTER});
    },

    setTeam: function(team) {
        this.team = team;
        return this;
    },
});

// Note: don't check for this directly. This is just a convenience alias for
// Characters on an "other" team that don't move.
Crafty.c("Enemy", {
    required: "Character, Color",

    init: function() {
        this.color("#7f0000");
        // Enemies don't move for now.
        this.setTeam(-1);
    },
});

Crafty.c("SpriteCharacter", {
    required: "Character, anim_start, SpriteAnimation",

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

Crafty.c("Ground", {
    required: "StaticObject, Color, Mouse",

    init: function() {
        this.color("#3f773f");
        this.attr({z: Z_GROUND});
    },
});

Crafty.c("Tree", {
    required: "StaticObject, SpaceFillingObject, Color",

    init: function() {
        this.color("#3f2f27");
        this.attr({z: Z_SCENERY});
    },
});
