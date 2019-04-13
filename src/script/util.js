"use strict";

export function getDistance(pos1, pos2) {
    // Taxicab/L1 distance.
    return Math.abs(pos2.x - pos1.x) + Math.abs(pos2.y - pos1.y);
}

// Note: This function is NOT equivalent to getDistance(pos1, pos2) <= 1,
// because it allows diagonals.
// TODO: Should we just use L-infinity for distance so it's more consistent
// with this?
export function isAdjacent(pos1, pos2) {
    return (Math.abs(pos2.x - pos1.x) <= 1 && Math.abs(pos2.y - pos1.y) <= 1);
}
