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
    checkAttack,
    checkInteract,
    checkMove,
    checkSwap,
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
            // No character selected yet. Try to select one, or just silently
            // do nothing if the target isn't selectable.
            doSelectCharacter(target, x, y);
        } else {
            if (!(target && target.has("GridObject"))) {
                userError("There's nothing there!");
                return;
            }

            let action = null;
            switch (getGlobalState()) {
                case StateEnum.CHARACTER_SELECTED:
                    if (doSelectCharacter(target, x, y)) {
                        return;
                    } else {
                        action = getAutoCharacterAction(target, x, y);
                        break;
                    }
                case StateEnum.CHARACTER_MOVE:
                    action = {checkIt: checkMove, doIt: doMove};
                    break;
                case StateEnum.CHARACTER_SWAP:
                    action = {checkIt: checkSwap, doIt: doSwap};
                    break;
                case StateEnum.CHARACTER_ATTACK:
                    action = {checkIt: checkAttack, doIt: doAttack};
                    break;
                case StateEnum.CHARACTER_INTERACT:
                    action = {checkIt: checkInteract, doIt: doInteract};
                    break;
                default:
                    internalError("Unknown state value.");
                    assert(false);
                    return;
            }
            if (action === null) {
                userError("No auto-action defined for that target.");
                return;
            }
            let checkVal = action.checkIt(target, x, y);
            if (checkVal.valid) {
                action.doIt(target, x, y, afterPlayerMove);
            } else {
                userError(checkVal.reason);
            }
        }
    } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
        debugLog("AAAAAAAAAA");
    }
}

// Automagically choose the right action for the character to do.
function getAutoCharacterAction(target, x, y) {
    switch (target.autoAction) {
        case AutoActionEnum.MOVE:
            return {checkIt: checkMove, doIt: doMove};
        case AutoActionEnum.ATTACK:
            return {checkIt: checkAttack, doIt: doAttack};
        case AutoActionEnum.INTERACT:
            return {checkIt: checkInteract, doIt: doInteract};
        case AutoActionEnum.NONE:
            return null;
        default:
            assert(false);
            return null;
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

