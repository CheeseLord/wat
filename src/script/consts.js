"use strict";

export const MENU_WIDTH = 240;

export const NUM_TEAMS = 2;

// TODO - This should depend on which player is moving.
export const MOVE_RANGE = 4;

export const Z_BACKGROUND  =  0; // Probably no entities here?
export const Z_GROUND      = 10;
export const Z_SCENERY     = 20; // Walls, doodads
export const Z_CHARACTER   = 30; // Things that move around
export const Z_MOVE_SQUARE = 35; // TODO: Too specific
export const Z_UI          = 50; // UI layer - above all world stuff

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
