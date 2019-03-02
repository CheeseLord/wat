"use strict";

export const MENU_WIDTH = 120;

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
export const StateEnum = Object.freeze({
    DEFAULT:         {},
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
        width:  16,
        height: 16,
    },
};

export const Game = {
    width:  MapGrid.width * MapGrid.tile.width,
    height: MapGrid.height * MapGrid.tile.height,
};
