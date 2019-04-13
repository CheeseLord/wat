"use strict";

export const MENU_WIDTH = 240;

export const NUM_TEAMS = 2;

// TODO - This should depend on which player is moving.
export const MOVE_RANGE = 4;

export const SPRITE_DUR_PER_FRAME = 250;
export const ANIM_DUR_SCROLL      = 50;
export const ANIM_DUR_CENTER_TURN = 200;
export const ANIM_DUR_MOVE        = 200;
export const ANIM_DUR_HALF_ATTACK = 100;

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
export const StateEnum = Object.freeze({
    DEFAULT:         {},
    ANIMATING:       {},
    PLAYER_SELECTED: {},
    PLAYER_MOVE:     {},
    PLAYER_SWAP:     {},
    PLAYER_ATTACK:   {},
});

///////////////////////////////////////////////////////////////////////////////
// Main Game object definition
export const MapGrid = {
    width:  25,
    height: 17,
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
