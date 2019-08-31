/* global Crafty */

"use strict";

import {
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
    getCurrentTeam,
    getGlobalState,
    getReadyCharacters,
    reportUserError,
    selectPlayer,
} from "./action.js";

///////////////////////////////////////////////////////////////////////

// Generic handler for clicks on the world view.
export function worldClickHandler(evt) {
    // TODO: Can't we just use evt.target.getPos()? If there's no target, we
    // sholdn't be doing anything anyway...
    let x = Math.floor(evt.realX / (MapGrid.tile.width + MapGrid.tile.hspace));
    let y = Math.floor(evt.realY /
            (MapGrid.tile.height + MapGrid.tile.vspace));
    if (x < 0 || x >= MapGrid.width || y < 0 || y >= MapGrid.height) {
        Crafty.log(`Ignoring click (${x}, ${y}) because it's out of bounds.`);
        return;
    }
    if (evt.mouseButton === Crafty.mouseButtons.LEFT) {
        Crafty.log(`You clicked at: (${x}, ${y})`);
        if (getGlobalState() === StateEnum.DEFAULT) {
            doSelectPlayer(evt, x, y);
        } else if (getGlobalState() === StateEnum.PLAYER_SELECTED) {
            doAutoPlayerAction(evt, x, y);
        } else if (getGlobalState() === StateEnum.PLAYER_MOVE) {
            doMove(evt, x, y);
        } else if (getGlobalState() === StateEnum.PLAYER_SWAP) {
            doSwap(evt, x, y);
        } else if (getGlobalState() === StateEnum.PLAYER_ATTACK) {
            doAttack(evt, x, y);
        } else if (getGlobalState() === StateEnum.PLAYER_INTERACT) {
            doInteract(evt, x, y);
        } else {
            Crafty.error("Unknown state value.");
            // assert(false);
        }
    } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
        Crafty.log("AAAAAAAAAA");
    }
};

// Automagically choose the right action for the player to do (corresponds to
// state "PLAYER_SELECTED").
function doAutoPlayerAction(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_SELECTED);
    if (evt.target && evt.target.has("Character")) {
        doSelectPlayer(evt, x, y);
    } else {
        doMove(evt, x, y);
    }
}

function doSelectPlayer(evt, x, y) {
    // assert(getGlobalState() === StateEnum.DEFAULT ||
    //        getGlobalState() === StateEnum.PLAYER_SELECTED);

    if (evt.target && evt.target.has("Character")) {
        if (evt.target.team !== getCurrentTeam()) {
            reportUserError("Character is on another team");
            return;
        }
        if (getReadyCharacters().indexOf(evt.target) === -1) {
            reportUserError("Character has already acted");
            return;
        }
        selectPlayer(evt.target);
        // TODO: Also setFocusOn? Or even call out to startCharacter?
        doMenu("topMenu");
    }
}

