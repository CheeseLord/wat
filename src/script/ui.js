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
    attackAction,
    autoAttackAction,
    checkAction,
    doAction,
    endTurnAction,
    getCurrentTeam,
    getGlobalState,
    getReadyCharacters,
    interactAction,
    moveAction,
    selectCharacter,
    selectedCharacter,
    specialAttackAction,
    swapPlacesAction,
} from "./action.js";
import {
    assert,
    debugLog,
    internalError,
    userError,
} from "./message.js";
import {
    equalPos,
    findPaths,
    getPath,
} from "./geometry.js";

///////////////////////////////////////////////////////////////////////////////
// "Janky class" UserInputDesc -- describes a raw input from the user (at the
// level of "clicked on X").
// .type is a UserInputType.

export const UserInputType = Object.freeze({
    WORLD_CLICK:    {},
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
    ERROR:   {},
    ACTION:  {},
    NOTHING: {},
    SELECT:  {},
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

export function disambigNothing() {
    return {type: UserDisambigType.NOTHING};
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
    let x = Math.floor(evt.realX / (TILE_WIDTH  + TILE_HGAP));
    let y = Math.floor(evt.realY / (TILE_HEIGHT + TILE_VGAP));
    let targetPos = {x: x, y: y};

    if (evt.mouseButton === Crafty.mouseButtons.LEFT) {
        debugLog(`You clicked at: (${x}, ${y})`);
        let disambig = figureOutWhatTheUserMeant(worldClickInput(targetPos));
        switch (disambig.type) {
            case UserDisambigType.NOTHING:
                debugLog("User intended NOTHING");
                return;
            case UserDisambigType.ERROR:
                debugLog("User intended ERROR");
                userError(disambig.message);
                return;
            case UserDisambigType.SELECT:
                debugLog("User intended SELECT");
                selectCharacter(disambig.target);
                // TODO: Also setFocusOn? Or even call out to startCharacter?
                doMenu("topMenu");
                return;
            case UserDisambigType.ACTION:
                debugLog("User intended ACTION");
                // Handled below
                break;
            default:
                internalError("Unknown UserDisambigType");
                return;
        }

        // Handle actions.
        let checkVal = checkAction(disambig.action);
        if (checkVal.valid) {
            doAction(disambig.action, afterPlayerMove);
        } else {
            userError(checkVal.reason);
        }
    } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
        debugLog("AAAAAAAAAA");
    }
}

///////////////////////////////////////////////////////////////////////////////

// Figure out what the users input actually means. Return a UserDisambig. This
// function should be free of side effects, but may query the world state.
function figureOutWhatTheUserMeant(inputDesc) {
    if (getGlobalState() === StateEnum.ANIMATING) {
        // Never try to handle a click if we're in the middle of an animation.
        // That's just asking for the game to wind up in an inconsistent state
        // where things get weirdly messed up.
        return disambigNothing();
    } else if (getGlobalState() === StateEnum.NO_INPUT) {
        // Ditto if we're not accepting input.
        // TODO merge these two states.
        return disambigNothing();
    }

    let subject = selectedCharacter;

    switch (inputDesc.type) {
        // WORLD_CLICK handled below.
        case UserInputType.WORLD_CLICK:
            break;
        // These are trivial wrappers.
        case UserInputType.SPECIAL_ATTACK:
            return disambigAction(specialAttackAction(subject));
        case UserInputType.AUTO_ATTACK:
            return disambigAction(autoAttackAction(subject));
        case UserInputType.END_TURN:
            return disambigAction(endTurnAction(subject));
        default:
            internalError("Unknown UserInputType");
            return disambigError("An internal error occurred.");
    }

    // Disambiguate a WORLD_CLICK.

    // TODO: Check the map or level object to get the dimensions of the level,
    // quit out here if the click is out of bounds.

    let targetPos = inputDesc.pos;

    // FIXME Hack: recreate target, since that's how the old code worked :/
    let maxZ   = -Infinity;
    let target = null;
    Crafty("GridObject").each(function() {
        if (equalPos(this.getPos(), targetPos) && this.z > maxZ) {
            target = this;
            maxZ   = this.z;
        }
    });

    if (!target) {
        return disambigError("There's nothing there!");
    }
    assert(target.has("GridObject"));

    if (getGlobalState() === StateEnum.DEFAULT ||
            getGlobalState() === StateEnum.CHARACTER_SELECTED) {
        // If we can select the target, favor that over any other action.
        let disambig = checkSelectCharacter(target);

        // For StateEnum.DEFAULT, we have to select because there's no one
        // already selected to take some other action. Propagate up any error
        // from checkSelectCharacter. For StateEnum.CHARACTER_SELECTED, if the
        // select failed then fall through into the code below which will try
        // to choose another action.
        if (disambig.type === UserDisambigType.SELECT ||
                getGlobalState() === StateEnum.DEFAULT) {
            return disambig;
        }
    }

    let theMap = findPaths(subject.getPos(), subject.speed);
    let path = getPath(theMap, subject.getPos(), targetPos);

    switch (getGlobalState()) {
        case StateEnum.CHARACTER_SELECTED:
            return disambigFromAutoAction(subject, target, path);
        case StateEnum.CHARACTER_MOVE:
            return disambigActionIfPathExistsElseError(
                path,
                moveAction(subject, path)
            );
        case StateEnum.CHARACTER_ATTACK:
            return disambigActionIfPathExistsElseError(
                path,
                attackAction(subject, target, path)
            );
        case StateEnum.CHARACTER_INTERACT:
            return disambigActionIfPathExistsElseError(
                path,
                interactAction(subject, target, path)
            );
        case StateEnum.CHARACTER_SWAP:
            return disambigAction(swapPlacesAction(subject, target));
        default:
            internalError("Unknown state value.");
            return disambigError("An internal error occurred.");
    }
}

function checkSelectCharacter(target) {
    if (!(target && target.has("Character"))) {
        return disambigNothing();
    }
    if (target.team !== getCurrentTeam()) {
        return disambigError("Character is on another team");
    }
    if (getReadyCharacters().indexOf(target) === -1) {
        return disambigError("Character has already acted");
    }

    return disambigSelect(target);
}

// Automagically choose the right action for the character to do.
function disambigFromAutoAction(subject, target, path) {
    switch (target.autoAction) {
        case AutoActionEnum.MOVE:
            return disambigActionIfPathExistsElseError(
                path,
                moveAction(subject, path)
            );
        case AutoActionEnum.ATTACK:
            return disambigActionIfPathExistsElseError(
                path,
                attackAction(subject, target, path)
            );
        case AutoActionEnum.INTERACT:
            return disambigActionIfPathExistsElseError(
                path,
                interactAction(subject, target, path)
            );
        case AutoActionEnum.NONE:
            return disambigError("No auto-action defined for that target.");
        default:
            internalError("Unknown auto-action type.");
            return disambigError("An internal error occurred.");
    }
}

function disambigActionIfPathExistsElseError(path, action) {
    if (path === null) {
        return disambigError("Can't reach the target");
    } else {
        return disambigAction(action);
    }
}

