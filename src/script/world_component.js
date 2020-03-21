/* global Crafty */

"use strict";

import {
    getGlobalState,
} from "./resolve_action.js";

import {
    Highlight,
    SPRITE_DUR_PER_FRAME,
    StateEnum,
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
    internalError,
    userMessage,
} from "./message.js";

import {
    getProportion,
} from "./util.js";

///////////////////////////////////////////////////////////////////////////////
// Component definitions

// Component for anything that is located in a grid space.
// Don't inherit from GridObject directly; use StaticObject or DynamicObject!
Crafty.c("GridObject", {
    required: "2D, DOM, Mouse",

    init: function() {
        this.attr({w: TILE_WIDTH, h: TILE_HEIGHT});
        this.attr({blocksMovement: false});

        this.autoAction = null;

        // Highlighting
        this._highlights = new Array(Highlight.NUM_VALS).fill(false);
        this._baseBgColor = null;
    },

    events: {
        "MouseOver": function() {
            // TODO hover-highlight in other states (but only for actions that
            // would actually be performed).
            // TODO: Move this logic... somewhere else. Seems like maybe a UI
            // question to me.
            if (getGlobalState() === StateEnum.CHARACTER_SELECTED) {
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

        return this._setHighlight(hlColor);
    },
    _setHighlight: function(color) {
        return this.css({
            "background-color": color,
        });
    },
    _clearHighlight: function() {
        return this.css({
            "background-color": this._baseBgColor,
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

Crafty.c("Health", {
    required: "DynamicObject",

    init: function() {
        this.setupHealthBar_();
        this.maxHealth(1);
    },

    setupHealthBar_: function() {
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

    updateHealthBar_: function() {
        let healthFrac = getProportion(this.health_, this.maxHealth_);
        let newW = this.healthBarTotWidth_ * healthFrac;
        this.healthBarForeground_.attr({w: newW});
    },

    // Set the initial health of the object.
    maxHealth: function(health) {
        this.maxHealth_ = health;
        this.health_    = health;
        this.updateHealthBar_();
        return this;
    },

    setHealth: function(health) {
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
        this.attr({
            name_: "Steve",
            speed: 4,
            team:  -1,
            z:     Z_CHARACTER,
        });
        // inherit blocksMovement=true from DynamicObject
    },

    setName_: function(name) {
        this.name_ = name;
        return this;
    },

    setSpeed: function(speed) {
        this.speed = speed;
        return this;
    },

    setTeam: function(team) {
        this.team = team;
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

