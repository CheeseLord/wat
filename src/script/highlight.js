/* global Crafty */

"use strict";

import {
    AutoActionEnum,
    Highlight,
} from "./consts.js";
import {
    assert,
} from "./message.js";

///////////////////////////////////////////////////////////////////////////////
//
//    THIS GOES IN highlight.js
//
///////////////////////////////////////////////////////////////////////////////

export function highlightPath(path) {
    for (var i = 0; i < path.length; i++) {
        Crafty("Ground").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                if (i === path.length - 1) {
                    this.enableHighlight(Highlight.ANIM_MOVE_END);
                } else {
                    this.enableHighlight(Highlight.ANIM_MOVE_MIDDLE);
                }
            }
        });
    }
}

export function clearHighlightType(hlType) {
    Crafty("GridObject").each(function() {
        this.disableHighlight(hlType);
    });
}
export function clearAllHighlights() {
    Crafty("GridObject").each(function() {
        this.clearHighlights();
    });
}

export function createMovementGrid(character) {
    Crafty("GridObject").each(function() {
        // Note: don't need to check isReachable here, since we only set
        // autoActions on objects that are in range.
        if (this.autoAction === AutoActionEnum.MOVE) {
            this.enableHighlight(Highlight.CAN_MOVE);
        } else if (this.autoAction === AutoActionEnum.ATTACK) {
            this.enableHighlight(Highlight.CAN_ATTACK);
        } else if (this.autoAction === AutoActionEnum.INTERACT) {
            this.enableHighlight(Highlight.CAN_INTERACT);
        } else if (this.autoAction !== AutoActionEnum.NONE) {
            assert(false);
        }
    });
}

