"use strict";

///////////////////////////////////////////////////////////////////////////////
// Viewscreen stuff

export const TILE_WIDTH  = 32;
export const TILE_HEIGHT = 32;
export const TILE_HGAP   = 4;
export const TILE_VGAP   = 4;

// Total dimensions of the game pane.
// TODO: There's no real reason for 25/17.
// TODO: If we're going to do this in terms of TILE_{WIDTH,HEIGHT}, at least
// also account for TILE_HGAP/TILE_VGAP and MENU_WIDTH.
export const GAME_WIDTH  = 25 * TILE_WIDTH;
export const GAME_HEIGHT = 17 * TILE_HEIGHT;

export const MENU_WIDTH  = 240;
export const MENU_HEIGHT = GAME_HEIGHT;

export const WORLDVIEW_WIDTH  = GAME_WIDTH - MENU_WIDTH;
export const WORLDVIEW_HEIGHT = GAME_HEIGHT;

///////////////////////////////////////////////////////////////////////////////
// Misc graphics stuff

export const Z_BACKGROUND  =  0; // Probably no entities here?
export const Z_GROUND      = 10;
export const Z_SCENERY     = 20; // Walls, doodads
export const Z_CHARACTER   = 30; // Things that move around
export const Z_PARTICLE    = 40; // Things briefly present for animations
export const Z_WORLD_UI    = 50; // UI stuff in the world itself
export const Z_UI          = 60; // Separate UI layer - above all world stuff

export const SPRITE_DUR_PER_FRAME      = 250;
export const ANIM_DUR_CENTER_TURN      = 200;
export const ANIM_DUR_MOVE             = 200;
export const ANIM_DUR_STEP             = 100;
export const ANIM_DUR_HALF_ATTACK      = 100;
export const ANIM_DUR_PAUSE_BW_MOV_ATK = 80;
export const ANIM_DUR_RANGED_SHOT      = 150;
export const ANIM_DUR_DMG_NUM_FADE_IN  = 100;
export const ANIM_DUR_DMG_NUM_FADE_OUT = 300;

///////////////////////////////////////////////////////////////////////////////
// Other stuff (actual gameplay?)

export const NUM_TEAMS   = 3;
export const PLAYER_TEAM = 0;

// 1d4 + 3
export const MELEE_ATTACK_DAMAGE_MIN = 4;
export const MELEE_ATTACK_DAMAGE_MAX = 7;
// 1d4 + 1
export const RANGED_ATTACK_DAMAGE_MIN = 2;
export const RANGED_ATTACK_DAMAGE_MAX = 5;
export const RANGED_ATTACK_RANGE = 6;

export const SPECIAL_ATTACK_DAMAGE_MIN = 3;
export const SPECIAL_ATTACK_DAMAGE_MAX = 5;
// TODO balance this
export const FIREBALL_DAMAGE_MIN = 5;
export const FIREBALL_DAMAGE_MAX = 10;
export const FIREBALL_RANGE      = 4;

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
export const ClickEnum = Object.freeze({
    DEFAULT:                 {},
    IN_DIALOGUE:             {},
    NO_INPUT:                {},
    ANIMATING:               {},
    CHARACTER_SELECTED:      {},
    CHARACTER_MOVE:          {},
    CHARACTER_SWAP:          {},
    CHARACTER_ATTACK:        {},
    CHARACTER_RANGED_ATTACK: {},
    CHARACTER_INTERACT:      {},
    CHARACTER_FIREBALL:      {},
});

// Highlighting colors.
// TODO proper rgba handling
//   - For now, these have to be exactly 9 characters long ("#RRGGBBAA").
//     StaticObject._setHighlight depends on it.
// TODO: these colors still need tweaking.
export const Highlight = Object.freeze({
    SELECTED_CHARACTER:     "#ffff00bb", // Character currently selected
    AVAILABLE_CHARACTER:    "#ffff0066", // Can be selected this turn

    // ANIM_<foo>_* is like HOVER_<foo>_*, but when the action is being
    // animated rather than simply considered.
    ANIM_INTERACT_END:      "#00bf0088",
    ANIM_INTERACT_MIDDLE:   "#9fff00ff",
    ANIM_ATTACK_END:        "#bf000088",
    ANIM_ATTACK_MIDDLE:     "#ff690088",
    ANIM_MOVE_END:          "#0000ff88",
    ANIM_MOVE_MIDDLE:       "#007f7f88",

    // HOVER_<foo>_{MIDDLE,END} are used to highlight how action <foo> will be
    // performed. _MIDDLE is for cells on the path to the target, _END is for
    // the target itself.
    HOVER_INTERACT_END:    "#00ff0088",
    HOVER_INTERACT_MIDDLE: "#4fb400ff",
    HOVER_ATTACK_END:      "#ff000088",
    HOVER_ATTACK_MIDDLE:   "#cf3400ff",
    HOVER_MOVE_END:        "#00007f88",
    HOVER_MOVE_MIDDLE:     "#003f3f88",

    // CAN_<foo> is the highlight applied when choosing a move for a character,
    // to indicate that <foo> is a valid action on the highlighted square.
    CAN_INTERACT:          "#007f0088",
    CAN_ATTACK:            "#7f000088",
    CAN_MOVE:              "#9f6900ff",
});

