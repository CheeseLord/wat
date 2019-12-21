/* global Crafty */

"use strict";

import {
    AutoActionEnum,
    StateEnum,
    TILE_HEIGHT,
    TILE_HGAP,
    TILE_VGAP,
    TILE_WIDTH,
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

///////////////////////////////////////////////////////////////////////////////
// "Janky class" UserInputDesc -- describes a raw input from the user (at the
// level of "clicked on X").
// .type is a UserInputType.

export const UserInputType = Object.freeze({
    WORLD_CLICK:    {},
    SWAP_PLACES:    {},
    SPECIAL_ATTACK: {},
    AUTO_ATTACK:    {},
    END_TURN:       {},
});

export function worldClickInput(pos) {
    return {
        type: UserInputType.WORLD_CLICK,
        pos:  pos,
    };
}

export function swapPlacesInput() {
    return {type: UserInputType.SWAP_PLACES};
}

export function specialAttackInput() {
    return {type: UserInputType.SPECIAL_ATTACK};
}

export function autoAttackInput() {
    return {type: UserInputType.AUTO_ATTACK};
}

export function endTurnInput() {
    return {type: UserInputType.END_TURN};
}

///////////////////////////////////////////////////////////////////////////////
// "Janky class" UserDisambig -- answers the question "what did the user mean?"
// Typically this is just a wrapper around an ActionDesc. But it can also be an
// "error" object which says "the user tried to do something invalid, here's
// the message to show them". Or some more special cases, like changing the
// selected character.
// .type is a UserDisambigType.

export const UserDisambigType = Object.freeze({
    ERROR:  {},
    ACTION: {},
    SELECT: {},
});

export function disambigError(message) {
    return {
        type:    UserDisambigType.ERROR,
        message: message,
    };
}

// action is an ActionDesc
export function disambigAction(action) {
    return {
        type:   UserDisambigType.ACTION,
        action: action,
    };
}

export function disambigSelect(target) {
    return {
        type:   UserDisambigType.SELECT,
        target: target,
    };
}

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
    let x = Math.floor(evt.realX / (TILE_WIDTH  + TILE_HGAP));
    let y = Math.floor(evt.realY / (TILE_HEIGHT + TILE_VGAP));

    // TODO: Check the map or level object to get the dimensions of the level,
    // quit out here if the click is out of bounds.

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

