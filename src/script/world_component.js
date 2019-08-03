/* global Crafty */

"use strict";

import {
    Highlight,
    MapGrid,
    HL_RADIUS,
    MOVE_RANGE,
    SPRITE_DUR_PER_FRAME,
    StateEnum,
    Z_CHARACTER,
    Z_GROUND,
    Z_SCENERY,
} from  "./consts.js";

import {
    findPaths,
    getPath,
    gridPosToGraphics,
} from "./geometry.js";

import {
    getGlobalState,
    selectedPlayer,
} from "./action.js";

///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that is located in a grid space.
// Don't inherit from GridObject directly; use StaticObject or DynamicObject!
Crafty.c("GridObject", {
    required: "2D, DOM, Mouse",

    init: function() {
        this.attr({w: MapGrid.tile.width, h: MapGrid.tile.height});
        this.attr({blocksMovement: false});

        // Highlighting
        this._highlights = new Array(Highlight.NUM_VALS).fill(false);
    },

    events: {
        "MouseOver": function() { hoverHighlightObj(this); },
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

    enableHighlight: function(hlType) {
        return this._setHighlightFlag(hlType, true);
    },
    disableHighlight: function(hlType) {
        return this._setHighlightFlag(hlType, false);
    },
    clearHighlights: function() {
        this._highlights.fill(false);
        return this._redraw();
    },

    // Set or clear one of the highlight flags
    _setHighlightFlag: function(hlType, val) {
        if (0 <= hlType && hlType < Highlight.NUM_VALS) {
            this._highlights[hlType] = val;
            return this._redraw();
        } else {
            Crafty.error(`Unrecognized highlight type: ${hlType}.`);
            return this;
        }
    },
    _redraw: function() {
        // Find the first highlight flag which is set.
        let displayHlType = 0;
        for (; displayHlType < Highlight.NUM_VALS; displayHlType++) {
            if (this._highlights[displayHlType]) {
                break;
            }
        }

        if (displayHlType >= Highlight.NUM_VALS) {
            // No highlight flags set.
            return this._clearBorder();
        }

        // Map each highlight flag to a border color.
        // TODO: Something better.
        // Note: old scheme was:
        //     AVAILABLE_CHAR: #1f3f9f
        //     SELECTED_CHAR:  #ff9f00
        let borderColor = null;
        switch (displayHlType) {
            case Highlight.SELECTED_CHAR:     borderColor = "#ffff00"; break;
            case Highlight.AVAILABLE_CHAR:    borderColor = "#ff7f00"; break;

            case Highlight.ANIM_PATH_END:     borderColor = "#0000ff"; break;
            case Highlight.ANIM_PATH_MIDDLE:  borderColor = "#4f4f7f"; break;
            case Highlight.HOVER_PATH_END:    borderColor = "#ff00ff"; break;
            case Highlight.HOVER_PATH_MIDDLE: borderColor = "#7f4f7f"; break;

            case Highlight.ATTACKABLE:        borderColor = "#ff0000"; break;
            case Highlight.INTERACTABLE:      borderColor = "#00ff00"; break;
                // TODO: Green looks bad with green ground
            case Highlight.REACHABLE:         borderColor = "#00ffff"; break;

            default:
                Crafty.error("Missing case for highlight type: " +
                    `${displayHlType}.`);
                return this;
        }

        return this._setBorder(borderColor);
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
});

// Component for things that never change state in any way.
Crafty.c("StaticObject", {
    required: "GridObject",
});

// Component for things that might change state.
Crafty.c("DynamicObject", {
    required: "GridObject, Tween",

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
});

Crafty.c("Character", {
    required: "DynamicObject",

    init: function() {
        this.name_ = "Steve";
        this.team = -1;
        this.attr({z: Z_CHARACTER});
        // inherit blocksMovement=true from DynamicObject
    },

    setName_: function(name) {
        this.name_ = name;
        return this;
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
    required: "StaticObject, Color",

    init: function() {
        this.color("#3f773f");
        this.attr({z: Z_GROUND});
    },
});

Crafty.c("Tree", {
    required: "StaticObject, Color",

    init: function() {
        this.color("#3f2f27");
        this.attr({z: Z_SCENERY});
        this.attr({blocksMovement: true});
    },
});

///////////////////////////////////////////////////////////////////////////////
// TODO find a better place to put these functions

function hoverHighlightObj(obj) {
    // TODO: Also do hover highlighting for StateEnum.PLAYER_SELECTED once we
    // do REACHABLE highlighting on selection (as opposed to only after
    // clicking the move button).
    if (getGlobalState() !== StateEnum.PLAYER_MOVE) {
        return;
    }

    let theMap  = findPaths(selectedPlayer.getPos(), MOVE_RANGE);
    let destPos = obj.getPos();
    let path    = getPath(theMap, selectedPlayer.getPos(), destPos);

    if (path === null) {
        return; // No path
    }

    for (let i = 0; i < path.length; i++) {
        // TODO: Why is this Crafty("Ground")? What if we later add other
        // passable components? Can't we just do it over all GridObjects?
        Crafty("Ground").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                if (i === path.length - 1) {
                    this.enableHighlight(Highlight.HOVER_PATH_END);
                } else {
                    this.enableHighlight(Highlight.HOVER_PATH_MIDDLE);
                }
            }
        });
    };
}

function clearHoverHighlights() {
    Crafty("GridObject").each(function() {
        this.disableHighlight(Highlight.HOVER_PATH_END);
        this.disableHighlight(Highlight.HOVER_PATH_MIDDLE);
    });
}
