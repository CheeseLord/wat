/* global Crafty */

"use strict";

import {
    AutoActionEnum,
    MapGrid,
    StateEnum,
} from "./consts.js";
import {
    doMenu,
} from "./menu.js";
import {
    afterPlayerMove,
    doAttack,
    doInteract,
    doMove,
    doSwap,
    getCurrentTeam,
    getGlobalState,
    getReadyCharacters,
    selectCharacter,
} from "./action.js";
import {
    assert,
    debugLog,
    internalError,
    userError,
} from "./message.js";

///////////////////////////////////////////////////////////////////////

// Generic handler for clicks on the world view.
export function worldClickHandler(evt) {
    if (getGlobalState() === StateEnum.ANIMATING) {
        // Never try to handle a click if we're in the middle of an animation.
        // That's just asking for the game to wind up in an inconsistent state
        // where things get weirdly messed up.
        return;
    } else if (getGlobalState() === StateEnum.NO_INPUT) {
        // Ditto if we're not accepting input.
        // TODO merge these two states.
        return;
    }

    // TODO: Can't we just use evt.target.getPos()? If there's no target, we
    // sholdn't be doing anything anyway...
    let x = Math.floor(evt.realX / (MapGrid.tile.width + MapGrid.tile.hspace));
    let y = Math.floor(evt.realY /
            (MapGrid.tile.height + MapGrid.tile.vspace));
    if (x < 0 || x >= MapGrid.width || y < 0 || y >= MapGrid.height) {
        debugLog(`Ignoring click (${x}, ${y}) because it's out of bounds.`);
        return;
    }

    let target = evt.target;

    if (evt.mouseButton === Crafty.mouseButtons.LEFT) {
        debugLog(`You clicked at: (${x}, ${y})`);
        if (getGlobalState() === StateEnum.DEFAULT) {
            doSelectCharacter(target, x, y);
        } else if (getGlobalState() === StateEnum.CHARACTER_SELECTED) {
            doAutoCharacterAction(target, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_MOVE) {
            doMove(target, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_SWAP) {
            doSwap(target, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_ATTACK) {
            doAttack(target, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_INTERACT) {
            doInteract(target, x, y, afterPlayerMove);
        } else {
            internalError("Unknown state value.");
            assert(false);
        }
    } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
        debugLog("AAAAAAAAAA");
    }
}

// Automagically choose the right action for the character to do (corresponds
// to state "CHARACTER_SELECTED").
function doAutoCharacterAction(target, x, y, callback) {
    if (!doSelectCharacter(target, x, y)) {
        if (!(target && target.has("GridObject"))) {
            userError("There's nothing there!");
            return;
        }
        switch (target.autoAction) {
            case AutoActionEnum.MOVE:
                doMove(target, x, y, callback);
                break;
            case AutoActionEnum.ATTACK:
                doAttack(target, x, y, callback);
                break;
            case AutoActionEnum.INTERACT:
                doInteract(target, x, y, callback);
                break;
            case AutoActionEnum.NONE:
                userError("No auto-action defined for that target.");
                break;
            default:
                assert(false);
                break;
        }
    }
}

function doSelectCharacter(target, x, y) {
    assert(getGlobalState() === StateEnum.DEFAULT ||
           getGlobalState() === StateEnum.CHARACTER_SELECTED);

    if (!(target && target.has("Character"))) {
        return false;
    }
    if (target.team !== getCurrentTeam()) {
        userError("Character is on another team");
        return false;
    }
    if (getReadyCharacters().indexOf(target) === -1) {
        userError("Character has already acted");
        return false;
    }

    selectCharacter(target);
    // TODO: Also setFocusOn? Or even call out to startCharacter?
    doMenu("topMenu");
    return true;
}

