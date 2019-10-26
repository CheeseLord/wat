"use strict";

export const MENU_WIDTH = 240;

export const NUM_TEAMS   = 2;
export const PLAYER_TEAM = 0;

// TODO - This should depend on which player is moving.
export const MOVE_RANGE = 4;

export const Z_BACKGROUND  =  0; // Probably no entities here?
export const Z_GROUND      = 10;
export const Z_SCENERY     = 20; // Walls, doodads
export const Z_CHARACTER   = 30; // Things that move around
export const Z_WORLD_UI    = 40; // UI stuff in the world itself
export const Z_UI          = 50; // Separate UI layer - above all world stuff

export const SPRITE_DUR_PER_FRAME      = 250;
export const ANIM_DUR_SCROLL           = 50;
export const ANIM_DUR_CENTER_TURN      = 200;
export const ANIM_DUR_MOVE             = 200;
export const ANIM_DUR_STEP             = 100;
export const ANIM_DUR_HALF_ATTACK      = 100;
export const ANIM_DUR_PAUSE_BW_MOV_ATK = 80;

// 1d4 + 3
export const ATTACK_DAMAGE_MIN = 4;
export const ATTACK_DAMAGE_MAX = 7;
// Exactly 4 damage
export const SPECIAL_ATTACK_DAMAGE_MIN = 4;
export const SPECIAL_ATTACK_DAMAGE_MAX = 4;

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
export const StateEnum = Object.freeze({
    DEFAULT:            {},
    NO_INPUT:           {},
    ANIMATING:          {},
    CHARACTER_SELECTED: {},
    CHARACTER_MOVE:     {},
    CHARACTER_SWAP:     {},
    CHARACTER_ATTACK:   {},
    CHARACTER_INTERACT: {},
});

export const AutoActionEnum = Object.freeze({
    NONE:     {},
    MOVE:     {},
    ATTACK:   {},
    INTERACT: {},
});

// List of highlighting types. Several of these can be set on a single object,
// in which case the lowest-valued one is the one that will be displayed.
export const Highlight = Object.freeze({
    SELECTED_CHARACTER:     0, // Character currently selected
    AVAILABLE_CHARACTER:    1, // Character that can be selected this turn

    // ANIM_<foo>_* is like HOVER_<foo>_*, but when the action is being
    // animated rather than simply considered.
    ANIM_INTERACT_END:      2,
    ANIM_INTERACT_MIDDLE:   3,
    ANIM_ATTACK_END:        4,
    ANIM_ATTACK_MIDDLE:     5,
    ANIM_MOVE_END:          6,
    ANIM_MOVE_MIDDLE:       7,

    // HOVER_<foo>_{MIDDLE,END} are used to highlight how action <foo> will be
    // performed. _MIDDLE is for cells on the path to the target, _END is for
    // the target itself.
    HOVER_INTERACT_END:     8,
    HOVER_INTERACT_MIDDLE:  9,
    HOVER_ATTACK_END:      10,
    HOVER_ATTACK_MIDDLE:   11,
    HOVER_MOVE_END:        12,
    HOVER_MOVE_MIDDLE:     13,

    // CAN_<foo> is the highlight applied when choosing a move for a character,
    // to indicate that <foo> is a valid action on the highlighted square.
    CAN_INTERACT:          14,
    CAN_ATTACK:            15,
    CAN_MOVE:              16,

    NUM_VALS:              17, // For sizing arrays of flag values
});

// TODO: Maybe separate horiz. and vert.? Should probably in general be
// MapGrid.tile.[hv]space/2, or something like that.
export const HL_RADIUS = 2;

///////////////////////////////////////////////////////////////////////////////
// Main Game object definition
// TODO Can these just be top-level globals named in ALL_CAPS?
export const MapGrid = {
    width:  25,
    height: 17,
    // TODO: "grid" vs. "tile"
    tile:   {
        // Dimensions of a tile
        width:  32,
        height: 32,
        // Amount of space between two tiles
        hspace: 4,
        vspace: 4,
    },
};

export const Game = {
    width:  MapGrid.width * MapGrid.tile.width,
    height: MapGrid.height * MapGrid.tile.height,
};
