"use strict";

// Based on one of the comments on:
//     https://stackoverflow.com/a/5040502
// Always use === for checking equality, otherwise always true
export var StateEnum = Object.freeze({
    DEFAULT:         {},
    PLAYER_SELECTED: {},
    PLAYER_MOVE:     {},
    PLAYER_SWAP:     {},
    PLAYER_ATTACK:   {},
});
