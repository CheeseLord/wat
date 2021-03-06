/* global Crafty */

"use strict";

import {
    EndTurnAction,
    FireballSpellAction,
    InteractAction,
    MeleeAttackAction,
    MoveAction,
    RangedAttackAction,
    SpecialAttackAction,
    SwapPlacesAction,
} from "./action_type.js";
import {
    chooseAiAction,
} from  "./ai.js";
import {
    ClickEnum,
    TILE_HEIGHT,
    TILE_HGAP,
    TILE_VGAP,
    TILE_WIDTH,
} from "./consts.js";
import {
    equalPos,
    findPaths,
    getPath,
} from "./geometry.js";
import {
    doActionMenu,
} from "./menu.js";
import {
    assert,
    debugLog,
    internalError,
    userError,
} from "./message.js";
import {
    state,
} from "./state.js";
import {
    canMoveThisTurn,
    gotPlayerAction,
    isOnCurrentTeam,
    selectCharacter,
    selectNextCharacter,
    // TODO: Does this work??
    selectedCharacter,
} from "./turn_order.js";
import {
    advanceCutscene,
} from "./dialogue.js";

let aaaaaer = aaaaa();

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

function worldClickInput(pos) {
    return {
        type: UserInputType.WORLD_CLICK,
        pos:  pos,
    };
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
                doActionMenu(disambig.target);
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
        gotPlayerAction(disambig.action);
    } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
        debugLog(aaaaaer.next().value);
    }
}

function * aaaaa() {
    let x = 0;
    while (true) {
        yield `AAAAA ${x}`;
        yield `BBBBB ${x}`;
        x++;
    }
}

///////////////////////////////////////////////////////////////////////////////

// Figure out what the users input actually means. Return a UserDisambig. This
// function should be free of side effects, but may query the world state.
function figureOutWhatTheUserMeant(inputDesc) {
    if (state.clickType === ClickEnum.ANIMATING) {
        // Never try to handle a click if we're in the middle of an animation.
        // That's just asking for the game to wind up in an inconsistent state
        // where things get weirdly messed up.
        return disambigNothing();
    } else if (state.isInCutscene) {
        advanceCutscene();
        return disambigNothing();
    } else if (state.clickType === ClickEnum.NO_INPUT) {
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
            return disambigAction(SpecialAttackAction.init(subject));
        case UserInputType.AUTO_ATTACK:
            return disambigAction(chooseAiAction(subject));
        case UserInputType.END_TURN:
            return disambigAction(EndTurnAction.init(subject));
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

    if (state.clickType === ClickEnum.DEFAULT ||
            state.clickType === ClickEnum.CHARACTER_SELECTED) {
        // If we can select the target, favor that over any other action.
        let disambig = checkSelectCharacter(target);

        // For ClickEnum.DEFAULT, we have to select because there's no one
        // already selected to take some other action. Propagate up any error
        // from checkSelectCharacter. For ClickEnum.CHARACTER_SELECTED, if the
        // select failed then fall through into the code below which will try
        // to choose another action.
        if (disambig.type === UserDisambigType.SELECT ||
                state.clickType === ClickEnum.DEFAULT) {
            return disambig;
        }
    }

    let theMap = findPaths(subject.getPos(), subject.speed);
    let path = getPath(theMap, subject.getPos(), targetPos);

    switch (state.clickType) {
        case ClickEnum.CHARACTER_SELECTED:
            return disambigFromAutoAction(target.autoAction);
        case ClickEnum.CHARACTER_MOVE:
            return disambigActionIfPathExistsElseError(
                path,
                MoveAction.init(subject, path)
            );
        case ClickEnum.CHARACTER_ATTACK:
            return disambigActionIfPathExistsElseError(
                path,
                MeleeAttackAction.init(subject, target, path)
            );
        case ClickEnum.CHARACTER_INTERACT:
            return disambigActionIfPathExistsElseError(
                path,
                InteractAction.init(subject, target, path)
            );
        case ClickEnum.CHARACTER_RANGED_ATTACK:
            return disambigAction(RangedAttackAction.init(subject, target));
        case ClickEnum.CHARACTER_FIREBALL:
            return disambigAction(FireballSpellAction.init(subject, target));
        case ClickEnum.CHARACTER_SWAP:
            return disambigAction(SwapPlacesAction.init(subject, target));
        default:
            internalError("Unknown state value.");
            return disambigError("An internal error occurred.");
    }
}

function checkSelectCharacter(target) {
    if (!(target && target.has("Character"))) {
        return disambigNothing();
    }
    if (!canMoveThisTurn(target)) {
        if (!isOnCurrentTeam(target)) {
            return disambigError("Character is on another team");
        } else {
            return disambigError("Character has already acted");
        }
    }

    return disambigSelect(target);
}

// Automagically choose the right action for the character to do.
function disambigFromAutoAction(action) {
    if (action === null) {
        return disambigError("No auto-action defined for that target.");
    } else {
        return disambigAction(action);
    }
}

function disambigActionIfPathExistsElseError(path, action) {
    if (path === null) {
        return disambigError("Can't reach the target");
    } else {
        return disambigAction(action);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Keyboard input handler.

export function setupKeyHandler() {
    Crafty.s("Keyboard").bind("KeyDown", function(e) {
        if (e.key === Crafty.keys.SPACE) {
            let character = selectNextCharacter();
            doActionMenu(character);
        }
    });
}

