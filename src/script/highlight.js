/* global Crafty */

"use strict";

import {
    ActionType,
} from "./action_type.js";
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
        if (this.autoAction === null) {
            // No highlight
        // TODO[#35]: this.autoAction.type.getDefaultHighlight()
        } else if (this.autoAction.type === ActionType.MOVE) {
            this.setDefaultHighlight(Highlight.CAN_MOVE);
        } else if (this.autoAction.type === ActionType.ATTACK) {
            this.setDefaultHighlight(Highlight.CAN_ATTACK);
        } else if (this.autoAction.type === ActionType.INTERACT) {
            this.setDefaultHighlight(Highlight.CAN_INTERACT);
        } else {
            // There are other ActionTypes, but none used as auto-actions.
            assert(false);
        }
    });
}

export function hoverHighlightAction(action) {
    if (action === null) {
        return;
    }

    let type = action.type;
    // We currently don't use action.subject
    let target = action.target;
    let path = action.path;

    let endHighlight  = null;
    let pathHighlight = null;

    // TODO[#35]: this.autoAction.type.getHoverHighlight{End,Middle}()
    if (type === ActionType.MOVE) {
        endHighlight  = Highlight.HOVER_MOVE_END;
        pathHighlight = Highlight.HOVER_MOVE_MIDDLE;
    } else if (type === ActionType.ATTACK) {
        endHighlight  = Highlight.HOVER_ATTACK_END;
        pathHighlight = Highlight.HOVER_ATTACK_MIDDLE;
    } else if (type === ActionType.INTERACT) {
        endHighlight  = Highlight.HOVER_INTERACT_END;
        pathHighlight = Highlight.HOVER_INTERACT_MIDDLE;
    } else {
        assert(false);
        return;
    }

    assert(path !== undefined);

    // TODO: Why would target be undefined?
    //   - ActionType.MOVE?
    //   - Can we check for that directly?
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
