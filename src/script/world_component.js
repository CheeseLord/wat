/* global Crafty */

"use strict";

import {
    AutoActionEnum,
    Highlight,
    MapGrid,
    HL_RADIUS,
    MOVE_RANGE,
    SPRITE_DUR_PER_FRAME,
    StateEnum,
    Z_CHARACTER,
    Z_GROUND,
    Z_SCENERY,
    Z_WORLD_UI,
} from  "./consts.js";

import {
    findPaths,
    getPath,
    gridPosToGraphics,
} from "./geometry.js";

import {
    getGlobalState,
    selectedCharacter,
} from "./action.js";

import {
    assert,
    internalError,
    userMessage,
} from "./message.js";

import {
    getProportion,
} from "./util.js";

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

        this.autoAction = AutoActionEnum.NONE;

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
            internalError(`Unrecognized highlight type: ${hlType}.`);
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
            return this._clearHighlight();
        }

        // Map each highlight flag to a border color.
        // TODO: Better colors.
        let hlColor = null;
        if (HL_STRAT === HighlightStrategy.BORDER) {
            switch (displayHlType) {
                case Highlight.SELECTED_CHARACTER:  hlColor = "#ffff00"; break;
                case Highlight.AVAILABLE_CHARACTER: hlColor = "#ff7f00"; break;

                case Highlight.ANIM_MOVE_END:       hlColor = "#0000ff"; break;
                case Highlight.ANIM_MOVE_MIDDLE:    hlColor = "#4f4f7f"; break;
                case Highlight.HOVER_MOVE_END:      hlColor = "#ff00ff"; break;
                case Highlight.HOVER_MOVE_MIDDLE:   hlColor = "#7f4f7f"; break;

                case Highlight.CAN_ATTACK:          hlColor = "#ff0000"; break;
                case Highlight.CAN_INTERACT:        hlColor = "#00ff00"; break;
                    // TODO: Green looks bad with green ground
                case Highlight.CAN_MOVE:            hlColor = "#00ffff"; break;

                default:
                    // I know, I haven't implemented a bunch of highlight cases
                    // for BORDER. TODO I guess.
                    internalError("Missing case for highlight type: " +
                        `${displayHlType}.`);
                    hlColor = "#000000";
            }
        } else if (HL_STRAT === HighlightStrategy.OVERLAY) {
            switch (displayHlType) {
                // TODO proper rgba handling
                // TODO: these colors still need tweaking.
                case Highlight.SELECTED_CHARACTER:
                    hlColor = "#ffff00bb"; break;
                case Highlight.AVAILABLE_CHARACTER:
                    hlColor = "#ffff0066"; break;

                case Highlight.CAN_MOVE:
                    hlColor = "#9f6900ff"; break;
                case Highlight.CAN_ATTACK:
                    hlColor = "#7f000088"; break;
                case Highlight.CAN_INTERACT:
                    hlColor = "#007f0088"; break;

                case Highlight.HOVER_MOVE_MIDDLE:
                    hlColor = "#003f3f88"; break;
                case Highlight.HOVER_MOVE_END:
                    hlColor = "#00007f88"; break;
                case Highlight.HOVER_ATTACK_MIDDLE:
                    hlColor = "#cf3400ff"; break;
                case Highlight.HOVER_ATTACK_END:
                    hlColor = "#ff000088"; break;
                case Highlight.HOVER_INTERACT_MIDDLE:
                    hlColor = "#4fb400ff"; break;
                case Highlight.HOVER_INTERACT_END:
                    hlColor = "#00ff0088"; break;

                case Highlight.ANIM_MOVE_MIDDLE:
                    hlColor = "#007f7f88"; break;
                case Highlight.ANIM_MOVE_END:
                    hlColor = "#0000ff88"; break;
                case Highlight.ANIM_ATTACK_MIDDLE:
                    hlColor = "#ff690088"; break;
                case Highlight.ANIM_ATTACK_END:
                    hlColor = "#bf000088"; break;
                case Highlight.ANIM_INTERACT_MIDDLE:
                    hlColor = "#9fff00ff"; break;
                case Highlight.ANIM_INTERACT_END:
                    hlColor = "#00bf0088"; break;

                default:
                    internalError("Missing case for highlight type: " +
                            `${displayHlType}.`);
                    return this;
            }
        } else {
            internalError("Unknown HighlightStrategy.");
            return this;
        }

        return this._setHighlight(hlColor);
    },
    _setHighlight: function(color) {
        if (HL_STRAT === HighlightStrategy.BORDER) {
            return this.css({
                "outline": "solid " + (HL_RADIUS) + "px " + color,
            });
        } else if (HL_STRAT === HighlightStrategy.OVERLAY) {
            return this.css({
                "background-color": color,
            });
        } else {
            internalError("Unknown HighlightStrategy.");
            return this;
        }
    },
    _clearHighlight: function() {
        if (HL_STRAT === HighlightStrategy.BORDER) {
            return this.css({
                "outline": "none",
            });
        } else if (HL_STRAT === HighlightStrategy.OVERLAY) {
            return this.css({
                "background-color": this._baseBgColor,
            });
        } else {
            internalError("Unknown HighlightStrategy.");
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

Crafty.c("Health", {
    required: "DynamicObject",

    init: function() {
        this.setupHealthBar_();
        this.maxHealth(1);
    },

    setupHealthBar_: function() {
        let x = this.x + (this.w / 8);
        let y = this.y + (6 * this.h / 8);
        let w = this.w * 6 / 8;
        let h = this.h * 1 / 8;

        // TODO Magic colors etc.
        // TODO Better way to have a few stacked z levels that are conceptually
        // in a single layer
        this.healthBarBackground_ = Crafty.e("2D, DOM, Color")
                .color("#800000")
                .attr({x: x, y: y, w: w, h: h, z: Z_WORLD_UI});
        this.healthBarForeground_ = Crafty.e("2D, DOM, Color")
                .color("#008000")
                .attr({x: x, y: y, w: w, h: h, z: Z_WORLD_UI + 1});
        this.attach(this.healthBarBackground_);
        this.attach(this.healthBarForeground_);
    },

    updateHealthBar_: function() {
        let healthFrac = getProportion(this.health_, this.maxHealth_);
        let newW = this.healthBarBackground_.w * healthFrac;
        this.healthBarForeground_.attr({w: newW});
    },

    // Set the initial health of the object.
    maxHealth: function(health) {
        this.maxHealth_ = health;
        this.health_    = health;
        this.updateHealthBar_();
        return this;
    },

    setHealth2: function(health) {
        this.health = health;
        this.updateHealthBar_();
        return this;
    },

    takeDamage: function(damage) {
        this.health_ -= damage;
        if (this.health_ <= 0) {
            this.destroy();
        } else {
            this.updateHealthBar_();
        }
        return this;
    },
});

Crafty.c("Character", {
    required: "DynamicObject, Health",

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

Crafty.c("Interactable", {
    required: "DynamicObject",

    // Note: subclasses should define an interact() method.
    // Apparetly I can't define it in the superclass because then the
    // superclass method gets called instead??
    // TODO: Maybe a better mechanism would be to have an interact() function
    // in Interactable itself, and a way to register callbacks?
});

Crafty.c("Lever", {
    required: "Interactable, unpulled_lever",

    init: function() {
        this.attr({z: Z_SCENERY});
        this.attr({blocksMovement: true});
    },

    interact: function(user) {
        userMessage(`${user.name_} pulled a lever.`);
    },
});

///////////////////////////////////////////////////////////////////////////////
// TODO find a better place to put these functions

function hoverHighlightObj(obj) {
    // TODO hover-highlight in other states (but only for actions that would
    // actually be performed).
    if (getGlobalState() !== StateEnum.CHARACTER_SELECTED) {
        return;
    }

    let theMap  = findPaths(selectedCharacter.getPos(), MOVE_RANGE);
    let destPos = obj.getPos();
    let path    = getPath(theMap, selectedCharacter.getPos(), destPos);

    if (obj.autoAction === AutoActionEnum.NONE) {
        return;
    } else if (path === null) {
        assert(false);
        return;
    }

    let endHighlight  = null;
    let pathHighlight = null;

    if (obj.autoAction === AutoActionEnum.MOVE) {
        endHighlight  = Highlight.HOVER_MOVE_END;
        pathHighlight = Highlight.HOVER_MOVE_MIDDLE;
    } else if (obj.autoAction === AutoActionEnum.ATTACK) {
        endHighlight  = Highlight.HOVER_ATTACK_END;
        pathHighlight = Highlight.HOVER_ATTACK_MIDDLE;
    } else if (obj.autoAction === AutoActionEnum.INTERACT) {
        endHighlight  = Highlight.HOVER_INTERACT_END;
        pathHighlight = Highlight.HOVER_INTERACT_MIDDLE;
    } else {
        assert(false);
        // Should never happen, but I guess this is as good a default as any?
        endHighlight  = Highlight.HOVER_MOVE_END;
        pathHighlight = Highlight.HOVER_MOVE_MIDDLE;
    }

    obj.enableHighlight(endHighlight);

    // Start at 1 because 0 is the ground under the character that's moving,
    // and that character is probably already highlighted as "selected".
    // End before length-1 because length-1 is the target, which was separately
    // highlighted above with endHighlight.
    for (let i = 1; i < path.length - 1; i++) {
        Crafty("GridObject").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                this.enableHighlight(pathHighlight);
            }
        });
    }
}

function clearHoverHighlights() {
    Crafty("GridObject").each(function() {
        this.disableHighlight(Highlight.HOVER_INTERACT_END);
        this.disableHighlight(Highlight.HOVER_INTERACT_MIDDLE);
        this.disableHighlight(Highlight.HOVER_ATTACK_END);
        this.disableHighlight(Highlight.HOVER_ATTACK_MIDDLE);
        this.disableHighlight(Highlight.HOVER_MOVE_END);
        this.disableHighlight(Highlight.HOVER_MOVE_MIDDLE);
    });
}
