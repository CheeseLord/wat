/* global Crafty */

"use strict";

import {
    TILE_HEIGHT,
    TILE_HGAP,
    TILE_VGAP,
    TILE_WIDTH,
} from  "./consts.js";
import {
    assert,
} from "./message.js";

export function equalPos(pos1, pos2) {
    return pos1.x === pos2.x && pos1.y === pos2.y;
}

export function isAdjacent(pos1, pos2) {
    return (Math.abs(pos2.x - pos1.x) <= 1 && Math.abs(pos2.y - pos1.y) <= 1);
}

export function midpoint(pos1, pos2) {
    return {x: 0.5 * (pos1.x + pos2.x), y: 0.5 * (pos1.y + pos2.y)};
}

export function gridPosToGraphics(gridPos) {
    return {
        x: gridPos.x * (TILE_WIDTH  + TILE_HGAP),
        y: gridPos.y * (TILE_HEIGHT + TILE_VGAP),
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
    for (let x = 0; x <= maxX; x++) {
        staticMap.push([]);
        for (let y = 0; y <= maxY; y++) {
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

export function getPathLength(theMap, startPos, endPos) {
    let thePath = getPath(theMap, startPos, endPos);
    if (thePath === null) {
        return Infinity;
    }
    assert(thePath.length >= 1);
    return thePath.length - 1;
}

// Get the list of cells along a path.
// TODO: Why take in startPos? theMap already knows the paths from startPos to
// everywhere...
export function getPath(theMap, startPos, endPos) {
    let cells = [];
    while (!(endPos.x === startPos.x && endPos.y === startPos.y)) {
        cells.push(endPos);
        endPos = theMap[endPos.x][endPos.y].parent;
        if (endPos === null) {
            return null; // No path
        }
    }
    cells.push(startPos);
    return cells.reverse();
}

// Check if it is possible to get next to destPos and do something with the
// object at destPos (such as interacting with an object or attacking from
// melee range). A destPos is also considered reachable if it is a passable
// square that you can move to.
export function isReachable(theMap, destPos) {
    let x = destPos.x;
    let y = destPos.y;
    return (theMap[x][y].parent !== null);
}

// Check if it is possible to move to destPos. This requires both that destPos
// is within range and that there is nothing blocking the movement.
export function canMoveTo(theMap, destPos) {
    let x = destPos.x;
    let y = destPos.y;
    return isReachable(theMap, destPos) && !theMap[x][y].isBlocked;
}

// Check if it is possible to move along the path, stopping at:
//   - The last cell if moveToLast
//   - The second-to-last cell if !moveToLast
// Even if !moveToLast, the last cell must still be reachable from the
// second-to-last. (moveToLast represents the difference between isReachable
// and canMoveTo).
export function isPathValid(theMap, subject, path, moveToLast) {
    if (path.length === 0) {
        return true;
    }

    if (!equalPos(subject.getPos(), path[0])) {
        return false;
    }

    let currPos = path[0];
    // Don't check if the start pos is blocked, because they're already there.
    for (let i = 1; i < path.length; i++) {
        let nextPos = path[i];
        if (theMap[nextPos.x][nextPos.y].isBlocked) {
            if (i === path.length - 1 && !moveToLast) {
                // Last cell doesn't need to be passable.
            } else {
                return false;
            }
        }
        if (!isAdjacent(currPos, nextPos)) {
            return false;
        }
        currPos = nextPos;
    }

    return true;
}

// Internal helpers

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
    theMap[startPos.x][startPos.y].parent = startPos;
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
            }
            theMap[nextPos.x][nextPos.y].parent = pos;
            if (!theMap[nextPos.x][nextPos.y].isBlocked) {
                queue.push({"pos": nextPos, "dist": dist - 1});
            }
        }
    }
    return theMap;
}

function getNeighbors(theMap, pos) {
    var x = pos.x;
    var y = pos.y;
    var neighbors = [];

    var xNeighbors = [x];
    var yNeighbors = [y];
    if (x !== 0)                    { xNeighbors.push(x - 1); }
    if (x !== theMap.length - 1)    { xNeighbors.push(x + 1); }
    if (y !== 0)                    { yNeighbors.push(y - 1); }
    if (y !== theMap[0].length - 1) { yNeighbors.push(y + 1); }

    for (let i = 0; i < xNeighbors.length; i++) {
        let x_ = xNeighbors[i];
        for (let j = 0; j < yNeighbors.length; j++) {
            let y_ = yNeighbors[j];

            if (x_ !== x || y_ !== y) {
                neighbors.push({x: x_, y: y_});
            }
        }
    }

    return neighbors;
}

// Get the distance between points, irrespective of path.
// Assumes the square root of 2 is 1.
export function getDistance(pos1, pos2) {
    let xDist = Math.abs(pos1.x - pos2.x);
    let yDist = Math.abs(pos1.y - pos2.y);
    return Math.max(xDist, yDist);
}

