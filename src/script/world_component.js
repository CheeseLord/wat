/* global Crafty */

"use strict";

import {MapGrid} from  "./consts.js";

///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that occupies a grid space.
Crafty.c("GridObject", {
    // TODO: Remove Mouse (get cat?)
    required: "SpaceFillingObject, 2D, DOM, Tween, Mouse",

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
            x:      newPos.x * MapGrid.tile.width,
            y:      newPos.y * MapGrid.tile.height,
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
            x: newPos.x * MapGrid.tile.width,
            y: newPos.y * MapGrid.tile.height,
        }, duration);
        // So that "setter" attributes can be chained together.
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

Crafty.c("Character", {
    required: "GridObject, Keyboard, Mouse",

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
        this._isHighlighted = false;
        this.team = -1;
    },

    setTeam: function(team) {
        this.team = team;
        return this;
    },

    setColors: function(newColors) {
        this.attr({
            _defaultColor:     newColors.defaultColor,
            _highlightedColor: newColors.highlightedColor,
        });
        // Start out not highlighted
        if (this.has("Color")) {
            this.color(this._defaultColor);
        }
        // TODO: Provide an alternative for sprites.
        // So that "setter" attributes can be chained together.
        return this;
    },

    highlight: function() {
        this._isHighlighted = true;
        if (this.has("Color")) {
            return this.color(this._highlightedColor);
        }
        // TODO: Provide an alternative for sprites.
        return this;
    },
    unhighlight: function() {
        this._isHighlighted = false;
        if (this.has("Color")) {
            return this.color(this._defaultColor);
        }
        // TODO: Provide an alternative for sprites.
        return this;
    },
    isHighlighted: function() {
        return this._isHighlighted;
    },
});
