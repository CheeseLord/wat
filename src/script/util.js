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


// BFS to create movement grid
export function createMovementGridPaths(startPos, grid, distance) {
    var visited = {};
    var queue = [];
    queue.push({"pos": startPos, "dist": distance});
    while (queue.length > 0) {
        var posAndDist = queue.shift();
        var pos = posAndDist["pos"];
        var dist = posAndDist["dist"];
        if (dist === 0) {
            continue;
        }
        for (var nextPos in getNeighbors(grid, pos)) {
            if (nextPos in visited) {
                continue;
            }
            visited[nextPos] = true;
            grid[nextPos.x][nextPos.y].parent = pos;
            queue.push({"pos": nextPos, "dist": dist - 1});
        }
    };
    return grid;
}

function getNeighbors(grid, pos) {
    var x = pos.x;
    var y = pos.y;
    var neighbors = [];
    if (x !== 0 && !grid[x - 1][y].isBlocked) {
        neighbors.push(grid[x - 1][y]);
    };
    if (x !== grid.length - 1 && !grid[x + 1][y].isBlocked) {
        neighbors.push(grid[x + 1][y]);
    };
    if (y !== 0 && !grid[x][y - 1].isBlocked) {
        neighbors.push(grid[x][y - 1]);
    };
    if (y !== grid[x].length - 1 && !grid[x][y + 1].isBlocked) {
        neighbors.push(grid[x][y + 1]);
    };
    return neighbors;
}
