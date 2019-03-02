/* global Crafty */

"use strict";

import {StateEnum} from "./consts.js";
import {doMenu} from  "./ui.js";

import {
    Game,
    characterActed,
    getGlobalState,
    selectPlayer,
    selectedPlayer,
    enemies,
    reportUserError,
    readyCharacters,
    removeMovementSquares,
    setGlobalState,
} from  "./main.js";


///////////////////////////////////////////////////////////////////////////////
// Action handlers

function doSelectPlayer(evt, x, y) {
    // assert(getGlobalState() === StateEnum.DEFAULT ||
    //        getGlobalState() === StateEnum.PLAYER_SELECTED);

    if (evt.target && evt.target.has("PlayerControllable")) {
        if (readyCharacters.indexOf(evt.target) === -1) {
            reportUserError("Character has already acted");
            return;
        }
        selectPlayer(evt.target);
        doMenu("topMenu");
    }
}

// Automagically choose the right action for the player to do (corresponds to
// state "PLAYER_SELECTED").
function doAutoPlayerAction(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_SELECTED);
    if (evt.target && evt.target.has("PlayerControllable")) {
        doSelectPlayer(evt, x, y);
    } else {
        doMove(evt, x, y);
    }
}

function doMove(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_MOVE ||
    //        getGlobalState() === StateEnum.PLAYER_SELECTED);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        Crafty.error("No player selected.");
        return;
    }

    // TODO: MovementSquares shouldn't be SpaceFillingObjects.
    if (evt.target && evt.target.has("SpaceFillingObject") &&
            !evt.target.has("MovementSquare")) {
        reportUserError("Can't move there; something's in the way.");
        return;
    } else if (!(evt.target && evt.target.has("MovementSquare"))) {
        reportUserError("Invalid destination (out of range?).");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu();
    setGlobalState(StateEnum.DEFAULT);
    removeMovementSquares();
    selectedPlayer.animateTo({x: x, y: y});
    selectedPlayer.one("TweenEnd", function() {
        characterActed(selectedPlayer);
    });
}

function doSwap(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_SWAP);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        Crafty.error("No player selected.");
        return;
    }

    if (evt.target === null) {
        reportUserError("There's nothing there to swap with.");
        return;
    } else if (!evt.target.has("PlayerControllable")) {
        reportUserError("Can't swap with non-player.");
        return;
    } if (evt.target === selectedPlayer) {
        reportUserError("Cannot swap player with self.");
        return;
    }

    // Swap positions of clicked player and selectedPlayer.
    Crafty.s("ButtonMenu").clearMenu();
    setGlobalState(StateEnum.DEFAULT);

    let selectPos = selectedPlayer.getPos();
    let clickPos  = evt.target.getPos();
    evt.target.animateTo(selectPos);
    selectedPlayer.animateTo(clickPos);
    selectedPlayer.one("TweenEnd", function() {
        characterActed(selectedPlayer);
    });
}

function doAttack(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_ATTACK);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        return;
    }

    if (evt.target === null) {
        reportUserError("No enemy there.");
        return;
    } else if (Math.abs(selectedPlayer.getPos().x - x) > 1 ||
            Math.abs(selectedPlayer.getPos().y - y) > 1) {
        reportUserError("Target not adjacent.");
        return;
    } else if (evt.target.has("PlayerControllable")) {
        reportUserError("Can't attack friendly unit.");
        return;
    }

    var targetWasEnemy = false;
    for (var i = 0; i < enemies.length; i++) {
        if (evt.target === enemies[i]) {
            enemies.splice(i, 1);
            evt.target.destroy();
            targetWasEnemy = true;
            break;
        }
    }
    if (!targetWasEnemy) {
        reportUserError("Can't attack non-enemy.");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu();
    setGlobalState(StateEnum.DEFAULT);
    characterActed(selectedPlayer);
}

///////////////////////////////////////////////////////////////////////

// Generic handler for clicks on the world view.
export function worldClickHandler(evt) {
    let x = Math.floor(evt.realX / Game.mapGrid.tile.width);
    let y = Math.floor(evt.realY / Game.mapGrid.tile.height);
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
        } else {
            Crafty.error("Unknown state value.");
            // assert(false);
        }
    } else if (evt.mouseButton === Crafty.mouseButtons.RIGHT) {
        Crafty.log("AAAAAAAAAA");
    }
};
