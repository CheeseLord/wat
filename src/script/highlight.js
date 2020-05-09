/* global Crafty */

"use strict";

import {
    Highlight,
} from  "./consts.js";
import {
    assert,
} from "./message.js";

export function highlightPath(path) {
    for (var i = 0; i < path.length; i++) {
        Crafty("Ground").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                // TODO: Different colors for different action types?
                if (i === path.length - 1) {
                    this.setAnimHighlight(Highlight.ANIM_MOVE_END);
                } else {
                    this.setAnimHighlight(Highlight.ANIM_MOVE_MIDDLE);
                }
            }
        });
    }
}

export function clearAllHighlights() {
    Crafty("GridObject").each(function() {
        this.clearAllHighlights();
    });
}

export function clearHoverHighlights() {
    Crafty("GridObject").each(function() {
        this.clearHoverHighlight();
    });
}

export function createMovementGrid(character) {
    Crafty("GridObject").each(function() {
        if (this.autoAction !== null) {
            let highlight = this.autoAction.type.getDefaultHighlight();
            this.setDefaultHighlight(highlight);
        }
    });
}

export function hoverHighlightAction(action) {
    if (action === null) {
        return;
    }

    // We currently don't use action.subject
    let target = action.target;
    let path   = action.path;
    assert(path !== undefined);

    let pathHighlight = action.type.getHoverHighlightMiddle();
    let endHighlight  = action.type.getHoverHighlightEnd();

    // TODO: Why would target be undefined?
    //   - MoveAction?
    //   - Can we check for that more directly somehow?
    //   - Can we not access action.target without first knowing that it
    //     exists?
    if (target !== undefined) {
        target.setHoverHighlight(endHighlight);
    } else {
        hoverHighlightPos(
            path[path.length - 1].x,
            path[path.length - 1].y,
            endHighlight);
    }

    // Start at 1 because 0 is the ground under the character that's moving,
    // and that character is probably already highlighted as "selected".
    // End before length-1 because length-1 is the target, which was separately
    // highlighted above with endHighlight.
    for (let i = 1; i < path.length - 1; i++) {
        hoverHighlightPos(path[i].x, path[i].y, pathHighlight);
    }
}

function hoverHighlightPos(x, y, highlightType) {
    // TODO: currently this highlights every GridObject at this position
    //      We iterate over every GridObject.  This is slow.
    Crafty("GridObject").each(function() {
        if (this.getPos().x === x &&
                this.getPos().y === y) {
            this.setHoverHighlight(highlightType);
        }
    });
}
