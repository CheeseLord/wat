/* global Crafty */

"use strict";

import {
    attackAction,
    endTurnAction,
    moveAction,
} from "./action_type.js";
import {
    findPaths,
    getPath,
    getDist,
} from "./geometry.js";


///////////////////////////////////////////////////////////////////////////////
// AI logic
//
// TODO: Move this section to ai.js
//
// Will need to resolve cyclic imports.
//   - Probably want to split action.js in two:
//       - Definitions of action types (pure data, no imports)
//       - Everything else
//     Is that enough?

export function chooseAiAction(character) {
    let characterPos = character.getPos();
    let theMap = findPaths(characterPos, 2 * character.speed);
    let nearestTarget = null;
    let bestDist = Infinity;
    let dist = null;
    Crafty("Character").each(function() {
        if (this.team === character.team) {
            return;
        }
        dist = getDist(theMap, characterPos, this.getPos());
        if (dist < bestDist) {
            bestDist = dist;
            nearestTarget = this;
        }
    });
    if (nearestTarget === null) {
        return endTurnAction(character);
    } else if (getDist(theMap, characterPos, nearestTarget.getPos()) <=
               character.speed) {
        let path = getPath(
            theMap,
            character.getPos(),
            nearestTarget.getPos()
        );
        return attackAction(character, nearestTarget, path);
    } else {
        let path = getPath(
            theMap,
            character.getPos(),
            nearestTarget.getPos()
        );
        let target = null;
        let x = path[character.speed].x;
        let y = path[character.speed].y;
        // FIXME: Don't reference "Ground" by name.
        Crafty("Ground").each(function() {
            if (this.getPos().x === x && this.getPos().y === y) {
                target = this;
            }
        });
        if (target === null) {
            return endTurnAction(character);
        } else {
            return moveAction(character, path.slice(0, character.speed + 1));
        }
    }
}
