/* global Crafty */

"use strict";

import {
    AutoActionEnum,
    Highlight,
} from  "./consts.js";

import {
    findPaths,
    getPath,
} from "./geometry.js";

import {
    assert,
} from "./message.js";

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

export function hoverHighlightObj(toObj, fromObj) {
    // TODO: Get the path from the actionDesc which will be stored with toObj,
    // don't take in fromObj at all.
    //   - In fact, this should just be hoverHighlightAction, not
    //     hoverHighlightObj.
    let theMap  = findPaths(
        fromObj.getPos(),
        fromObj.actionPoints,
    );
    let destPos = toObj.getPos();
    let path    = getPath(theMap, fromObj.getPos(), destPos);

    if (toObj.autoAction === AutoActionEnum.NONE) {
        return;
    } else if (path === null) {
        assert(false);
        return;
    }

    let endHighlight  = null;
    let pathHighlight = null;

    if (toObj.autoAction === AutoActionEnum.MOVE) {
        endHighlight  = Highlight.HOVER_MOVE_END;
        pathHighlight = Highlight.HOVER_MOVE_MIDDLE;
    } else if (toObj.autoAction === AutoActionEnum.ATTACK) {
        endHighlight  = Highlight.HOVER_ATTACK_END;
        pathHighlight = Highlight.HOVER_ATTACK_MIDDLE;
    } else if (toObj.autoAction === AutoActionEnum.INTERACT) {
        endHighlight  = Highlight.HOVER_INTERACT_END;
        pathHighlight = Highlight.HOVER_INTERACT_MIDDLE;
    } else {
        assert(false);
        // Should never happen, but I guess this is as good a default as any?
        endHighlight  = Highlight.HOVER_MOVE_END;
        pathHighlight = Highlight.HOVER_MOVE_MIDDLE;
    }

    toObj.enableHighlight(endHighlight);

    // Start at 1 because 0 is the ground under the character that's moving,
    // and that character is probably already highlighted as "selected".
    // End before length-1 because length-1 is the target, which was separately
    // highlighted above with endHighlight.
    for (let i = 1; i < path.length - 1; i++) {
        Crafty("GridObject").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                this.enableHighlight(pathHighlight);
            }
        });
    }
}

export function clearHoverHighlights() {
    Crafty("GridObject").each(function() {
        this.disableHighlight(Highlight.HOVER_INTERACT_END);
        this.disableHighlight(Highlight.HOVER_INTERACT_MIDDLE);
        this.disableHighlight(Highlight.HOVER_ATTACK_END);
        this.disableHighlight(Highlight.HOVER_ATTACK_MIDDLE);
        this.disableHighlight(Highlight.HOVER_MOVE_END);
        this.disableHighlight(Highlight.HOVER_MOVE_MIDDLE);
    });
}
