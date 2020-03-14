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
import {
    checkAction,
} from "./resolve_action.js";


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
    } else {
        let path = getPath(
            theMap,
            characterPos,
            nearestTarget.getPos()
        );
        if (path === null) {
            return endTurnAction(character);
        }

        let tryAttack = attackAction(character, nearestTarget, path);
        if (checkAction(tryAttack).valid) {
            return tryAttack;
        }

        // Can't attack the target; instead, move toward it as far as we can.
        // Give up once we get down to a length of 1, since that's just the
        // starting cell (and doesn't indicate actually moving anywhere).
        while (path.length > 1) {
            let tryMove = moveAction(character, path);
            if (checkAction(tryMove).valid) {
                return tryMove;
            }

            // The move action wasn't valid; shorten it by 1 and try again.
            path.pop();
        }

        // Even after shortening the path down to nothing, we weren't able to
        // move. This can happen if we are adjacent to the target, but don't
        // have enough action points to attack it. In this case, skip our turn
        // since we have nothing useful to do.
        return endTurnAction(character);
    }
}
