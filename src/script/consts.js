"use strict";

export const MENU_WIDTH = 240;

export const NUM_TEAMS = 2;

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
        width:  32,
        height: 32,
    },
};

export const Game = {
    width:  MapGrid.width * MapGrid.tile.width,
    height: MapGrid.height * MapGrid.tile.height,
};
