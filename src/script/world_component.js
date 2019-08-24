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

const HighlightStrategy = Object.freeze({
    BORDER:  {},
    OVERLAY: {},
});

const HL_STRAT = HighlightStrategy.OVERLAY;

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

        this._baseBgColor = null;
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

    baseBgColor: function(color) {
        this._baseBgColor = color;
        this._redraw();
        return this;
    },

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
        if (HL_STRAT === HighlightStrategy.BORDER) {
            // In this case, there is never an overlay. Always apply the
            // background color, since otherwise we need two separate sprites
            // for the two strategies.
            this.css({
                "background-color": this._baseBgColor,
            });
        }

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
        let hlColor = null;
        if (HL_STRAT === HighlightStrategy.BORDER) {
            switch (displayHlType) {
                case Highlight.SELECTED_CHAR:     hlColor = "#ffff00"; break;
                case Highlight.AVAILABLE_CHAR:    hlColor = "#ff7f00"; break;

                case Highlight.ANIM_PATH_END:     hlColor = "#0000ff"; break;
                case Highlight.ANIM_PATH_MIDDLE:  hlColor = "#4f4f7f"; break;
                case Highlight.HOVER_PATH_END:    hlColor = "#ff00ff"; break;
                case Highlight.HOVER_PATH_MIDDLE: hlColor = "#7f4f7f"; break;

                case Highlight.ATTACKABLE:        hlColor = "#ff0000"; break;
                case Highlight.INTERACTABLE:      hlColor = "#00ff00"; break;
                    // TODO: Green looks bad with green ground
                case Highlight.REACHABLE:         hlColor = "#00ffff"; break;

                default:
                    Crafty.error("Missing case for highlight type: " +
                        `${displayHlType}.`);
                    return this;
            }
        } else if (HL_STRAT === HighlightStrategy.OVERLAY) {
            switch (displayHlType) {
                // TODO proper rgba handling
                case Highlight.SELECTED_CHAR:     hlColor = "#ffff0088"; break;
                case Highlight.AVAILABLE_CHAR:    hlColor = "#ff7f0088"; break;

                case Highlight.ANIM_PATH_END:     hlColor = "#0000ff88"; break;
                case Highlight.ANIM_PATH_MIDDLE:  hlColor = "#4f4f7f88"; break;
                case Highlight.HOVER_PATH_END:    hlColor = "#ff00ff88"; break;
                case Highlight.HOVER_PATH_MIDDLE: hlColor = "#7f4f7f88"; break;

                case Highlight.ATTACKABLE:        hlColor = "#ff000088"; break;
                case Highlight.INTERACTABLE:      hlColor = "#00ff0088"; break;
                    // TODO: Green looks bad with green ground
                case Highlight.REACHABLE:         hlColor = "#00ffff88"; break;

                default:
                    Crafty.error("Missing case for highlight type: " +
                            `${displayHlType}.`);
                    return this;
            }
        } else {
            Crafty.log("Error: unknown HighlightStrategy.");
            return this;
        }

        return this._setBorder(hlColor);
    },
    _setBorder: function(color) {
        if (HL_STRAT === HighlightStrategy.BORDER) {
            return this.css({
                "outline": "solid " + (HL_RADIUS) + "px " + color,
            });
        } else if (HL_STRAT === HighlightStrategy.OVERLAY) {
            return this.css({
                "background-color":   color,
            });
        } else {
            Crafty.log("Error: unknown HighlightStrategy.");
            return this;
        }
    },
    _clearBorder: function() {
        if (HL_STRAT === HighlightStrategy.BORDER) {
            return this.css({
                "outline": "none",
            });
        } else if (HL_STRAT === HighlightStrategy.OVERLAY) {
            return this.css({
                "background-color":   this._baseBgColor,
            });
        } else {
            Crafty.log("Error: unknown HighlightStrategy.");
            return this;
        }
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
        this.health = 1;
        this.team = -1;
        this.attr({z: Z_CHARACTER});
        // inherit blocksMovement=true from DynamicObject
    },

    setName_: function(name) {
        this.name_ = name;
        return this;
    },

    setHealth: function(health) {
        this.health = health;
        return this;
    },

    setTeam: function(team) {
        this.team = team;
        return this;
    },

    takeDamage: function(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.destroy();
        }
        return this;
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
        this.baseBgColor("#764e00");
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
