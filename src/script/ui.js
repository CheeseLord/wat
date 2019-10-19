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
    doAttack,
    doInteract,
    doMove,
    doSwap,
    endCharacter,
    getCurrentTeam,
    getGlobalState,
    getReadyCharacters,
    selectCharacter,
    selectedCharacter,
    setGlobalState,
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

    function afterPlayerMove() {
        Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
        setGlobalState(StateEnum.DEFAULT);
        endCharacter(selectedCharacter);
    }

    if (evt.mouseButton === Crafty.mouseButtons.LEFT) {
        debugLog(`You clicked at: (${x}, ${y})`);
        if (getGlobalState() === StateEnum.DEFAULT) {
            doSelectCharacter(evt, x, y);
        } else if (getGlobalState() === StateEnum.CHARACTER_SELECTED) {
            doAutoCharacterAction(evt, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_MOVE) {
            doMove(evt, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_SWAP) {
            doSwap(evt, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_ATTACK) {
            doAttack(evt, x, y, afterPlayerMove);
        } else if (getGlobalState() === StateEnum.CHARACTER_INTERACT) {
            doInteract(evt, x, y, afterPlayerMove);
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
function doAutoCharacterAction(evt, x, y, callback) {
    if (!doSelectCharacter(evt, x, y)) {
        if (!(evt.target && evt.target.has("GridObject"))) {
            userError("There's nothing there!");
            return;
        }
        switch (evt.target.autoAction) {
            case AutoActionEnum.MOVE:
                doMove(evt, x, y, callback);
                break;
            case AutoActionEnum.ATTACK:
                doAttack(evt, x, y, callback);
                break;
            case AutoActionEnum.INTERACT:
                doInteract(evt, x, y, callback);
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

function doSelectCharacter(evt, x, y) {
    assert(getGlobalState() === StateEnum.DEFAULT ||
           getGlobalState() === StateEnum.CHARACTER_SELECTED);

    if (!(evt.target && evt.target.has("Character"))) {
        return false;
    }
    if (evt.target.team !== getCurrentTeam()) {
        userError("Character is on another team");
        return false;
    }
    if (getReadyCharacters().indexOf(evt.target) === -1) {
        userError("Character has already acted");
        return false;
    }

    selectCharacter(evt.target);
    // TODO: Also setFocusOn? Or even call out to startCharacter?
    doMenu("topMenu");
    return true;
}

