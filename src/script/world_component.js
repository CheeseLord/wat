/* global Crafty */

"use strict";

import {
    MapGrid,
    HL_RADIUS,
    SPRITE_DUR_PER_FRAME,
    Z_GROUND,
    Z_CHARACTER,
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
        this._isHighlighted = false;
    },

    _addBorder: function(color) {
        return this.css({
            "outline": "solid " + (HL_RADIUS) + "px " + color,
        });
    },
    _clearBorder: function() {
        return this.css({
            "outline": "none",
        });
    },

    markSelected: function() {
        return this._addBorder("#ff9f00");
    },
    markReady: function() {
        return this._addBorder("#333333");
    },
    unmark: function() {
        return this._clearBorder();
    },
});

Crafty.c("Character", {
    // TODO: Remove Keyboard? It's not used anymore, right?
    required: "Highlightable, SpaceFillingObject, Keyboard, Mouse",

    init: function() {
        // Insert grumpy cat "no" image here.
        // this.bind("KeyDown", function(e) {
        //     if (e.key === Crafty.keys.LEFT_ARROW) {
        //         this.moveBy({x: -1, y:  0});
        //     } else if (e.key === Crafty.keys.RIGHT_ARROW) {
        //         this.moveBy({x:  1, y:  0});
        //     } else if (e.key === Crafty.keys.UP_ARROW) {
        //         this.moveBy({x:  0, y: -1});
        //     } else if (e.key === Crafty.keys.DOWN_ARROW) {
        //         this.moveBy({x:  0, y:  1});
        //     }
        // });
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

Crafty.c("Highlight", {
    required: "2D, DOM, Tween, Color",
});
