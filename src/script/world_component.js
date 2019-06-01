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

///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that occupies a grid space.
Crafty.c("GridObject", {
    required: "2D, DOM, Tween",

    init: function() {
        this.attr({w: MapGrid.tile.width, h: MapGrid.tile.height});
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
            // TODO: Refactor all the places that use width + hspace and
            // height + vspace. Maybe just add (computed) constants for those?
            x:      newPos.x * (MapGrid.tile.width  + MapGrid.tile.hspace),
            y:      newPos.y * (MapGrid.tile.height + MapGrid.tile.vspace),
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
    animateTo: function(newPos, duration) {
        // newPos is {x: newX, y: newY}
        this.attr({
            _tileX: newPos.x,
            _tileY: newPos.y,
        });
        this.tween({
            x: newPos.x * (MapGrid.tile.width  + MapGrid.tile.hspace),
            y: newPos.y * (MapGrid.tile.height + MapGrid.tile.vspace),
        }, duration);
        // So that "setter" attributes can be chained together.
        return this;
    },
});

// Anything that takes up space, in the sense that you can't have two of them
// on the same tile. Provides no new functionality, but the component is
// checked in movement code.
Crafty.c("SpaceFillingObject", {
    required: "GridObject",
});

Crafty.c("Highlightable", {
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
    required: "Highlightable, SpaceFillingObject, Mouse",

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
    required: "GridObject, Color, Mouse",

    init: function() {
        this.color("#3f773f");
        this.attr({z: Z_GROUND});
    },
});

Crafty.c("Tree", {
    required: "SpaceFillingObject, Color",

    init: function() {
        this.color("#3f2f27");
        this.attr({z: Z_SCENERY});
    },
});

Crafty.c("Highlight", {
    required: "2D, DOM, Tween, Color",
});
