/* global Crafty */

"use strict";

import {
    MapGrid,
} from  "./consts.js";

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

export function midpoint(pos1, pos2) {
    return {x: 0.5 * (pos1.x + pos2.x), y: 0.5 * (pos1.y + pos2.y)};
}

export function gridPosToGraphics(gridPos) {
    return {
        x: gridPos.x * (MapGrid.tile.width  + MapGrid.tile.hspace),
        y: gridPos.y * (MapGrid.tile.height + MapGrid.tile.vspace),
    };
}

// TODO: graphicsPosToGrid?


///////////////////////////////////////////////////////////////////////////////
// Maps and pathfinding

// A Map is a 2D array, indexed [x][y]. Each element is an object with fields:
//     isBlocked = true if the square is blocked, so can't be moved into
//     parent    = absolute position of the parent tile according to
//         pathfinding (that is, the second-to-last cell on the path to this
//         one). Stored as {x:x, y:y}. If this tile is unreachable or
//         pathfinding has not been done yet, is null.

// This is a Map based only on StaticObjects. If staticMap[x][y].isBlocked is
// false, that means the tile isn't blocked by a StaticObject, but there might
// still be a DynamicObject there. staticMap[x][y].parent is always null.
var staticMap = [];

// This function must be called whenever a new level is loaded (before
// findPaths is used).
export function updateMapForNewLevel() {
    // First compute the bounds, because apparently those aren't recorded
    // anywhere.
    let maxX = 0;
    let maxY = 0;
    Crafty("StaticObject").each(function() {
        let pos = this.getPos();
        if (pos.x > maxX) {
            maxX = pos.x;
        }
        if (pos.y > maxY) {
            maxY = pos.y;
        }
    });

    // Create arrays of the appropriate lengths.
    staticMap = [];
    for (let x = 0; x < maxX; x++) {
        staticMap.push([]);
        for (let y = 0; y < maxY; y++) {
            staticMap[x].push({
                isBlocked: false,
                parent:    null,
            });
        }
    }

    // Fill in the isBlocked values for StaticObjects.
    Crafty("StaticObject").each(function() {
        if (this.blocksMovement) {
            staticMap[this.getPos().x][this.getPos().y].isBlocked = true;
        }
    });
}

// Return a Map based on the current state of the level, with paths calculated.
export function findPaths(startPos, maxDistance) {
    let dynamicMap = getDynamicMap();
    computePathsOnMap(startPos, dynamicMap, maxDistance);
    return dynamicMap;
}

// Compute a Map for the current state of the level, but don't do pathfinding.
function getDynamicMap() {
    let dynamicMap = [];
    // Clone the staticMap.
    for (let x = 0; x < staticMap.length; x++) {
        dynamicMap.push([]);
        for (let y = 0; y < staticMap[x].length; y++) {
            dynamicMap[x].push({
                isBlocked: staticMap[x][y].isBlocked,
                parent:    staticMap[x][y].parent,
            });
        }
    }

    Crafty("DynamicObject").each(function() {
        if (this.blocksMovement) {
            // TODO bounds check?
            dynamicMap[this.getPos().x][this.getPos().y].isBlocked = true;
        }
    });

    return dynamicMap;
}

// Do pathfinding, given a map of the current state of the level. Modifies the
// map in place.
function computePathsOnMap(startPos, theMap, distance) {
    var queue = [];
    queue.push({"pos": startPos, "dist": distance});
    while (queue.length > 0) {
        var posAndDist = queue.shift();
        var pos = posAndDist["pos"];
        var dist = posAndDist["dist"];
        if (dist === 0) {
            continue;
        }
        let neighbors = getNeighbors(theMap, pos);
        // Sigh. JavaScript foreach loops.
        for (let i = 0; i < neighbors.length; i++) {
            let nextPos = neighbors[i];
            if (theMap[nextPos.x][nextPos.y].parent !== null) {
                continue;
            };
            theMap[nextPos.x][nextPos.y].parent = pos;
            queue.push({"pos": nextPos, "dist": dist - 1});
        }
    };
    return theMap;
}

function getNeighbors(theMap, pos) {
    var x = pos.x;
    var y = pos.y;
    var neighbors = [];
    if (x !== 0 && !theMap[x - 1][y].isBlocked) {
        neighbors.push({x: x - 1, y: y});
    };
    if (x !== theMap.length - 1 && !theMap[x + 1][y].isBlocked) {
        neighbors.push({x: x + 1, y: y});
    };
    if (y !== 0 && !theMap[x][y - 1].isBlocked) {
        neighbors.push({x: x, y: y - 1});
    };
    if (y !== theMap[x].length - 1 && !theMap[x][y + 1].isBlocked) {
        neighbors.push({x: x, y: y + 1});
    };
    return neighbors;
}
