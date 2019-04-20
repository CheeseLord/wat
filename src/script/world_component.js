/* global Crafty */

"use strict";

import {
    MapGrid,
    HL_RADIUS,
    SPRITE_DUR_PER_FRAME,
    Z_HIGHLIGHT,
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

Crafty.c("SpaceFillingObject", {
    required: "GridObject",
});

Crafty.c("Character", {
    required: "SpaceFillingObject, Keyboard, Mouse",

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
        this.attr({z: Z_CHARACTER});
        this._highlightEntity = null;
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
        if (this._isHighlighted) {
            return this;
        }
        this._isHighlighted = true;
        if (this.has("Color")) {
            return this.color(this._highlightedColor);
        } else {
            // Add a "border" around this.
            this._highlightEntity = Crafty.e("Highlight")
                    .color("#ff9f00")
                    .attr({
                        x: this.x - HL_RADIUS,
                        y: this.y - HL_RADIUS,
                        z: Z_HIGHLIGHT,
                        w: this.w + 2 * HL_RADIUS,
                        h: this.h + 2 * HL_RADIUS,
                    });
            // Make the "border" follow us when we move.
            // TODO: This rapidly makes it clear that the border is just a
            // solid square behind us. Can we make it more of an actual border?
            this.attach(this._highlightEntity);
        }
        return this;
    },
    unhighlight: function() {
        if (!this._isHighlighted) {
            return this;
        }
        this._isHighlighted = false;
        if (this.has("Color")) {
            return this.color(this._defaultColor);
        } else {
            this._highlightEntity.destroy();
        }
        return this;
    },
    isHighlighted: function() {
        return this._isHighlighted;
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
