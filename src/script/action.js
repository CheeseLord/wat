/* global Crafty */

"use strict";

import {StateEnum} from "./consts.js";
import {doMenu} from "./ui.js";

import {
    Game,
    readyCharacters,
    enemies,
    getGlobalState,
    setGlobalState,
} from "./main.js";

export var selectedPlayer;

Crafty.c("MovementSquare", {
    required: "GridObject, Mouse",

    init: function() {
        this.color("#555555", 0.5);
    },
});

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

///////////////////////////////////////////////////////////////////////////////
// Menu-related action helpers (and some misc?)

export function reportUserError(text) {
    // TODO: Put this somewhere the user will actually see it.
    Crafty.error(text);
}

export function selectPlayer(player) {
    deselectPlayer();
    selectedPlayer = player;
    selectedPlayer.highlight();
}

export function removeMovementSquares() {
    Crafty("MovementSquare").each(function() {
        this.destroy();
    });
}

export function deselectPlayer() {
    if (selectedPlayer && selectedPlayer.isHighlighted()) {
        selectedPlayer.unhighlight();
        selectedPlayer = null;
        // TODO: Probably the menu table should instead define the state we
        // transition to on CLEAR_MENU?
        setGlobalState(StateEnum.DEFAULT);
    }
}

export function characterActed(character) {
    deselectPlayer();

    // The character is no longer ready.
    let index = readyCharacters.indexOf(character);
    if (index === -1) {
        // TODO: We should never get here, but handle it better anyway.
        return;
    } else {
        readyCharacters.splice(index, 1);
    }


    // If no characters are ready, start the next turn.
    if (readyCharacters.length === 0) {
        Crafty.log("Reached end of round.");
        Crafty("PlayerControllable").each(function() {
            readyCharacters.push(this);
        });
    }
}

function createMovementSquare(x, y) {
    var occupied = false;
    Crafty("SpaceFillingObject").each(function() {
        if (this.getPos().x === x && this.getPos().y === y) {
            occupied = true;
        }
    });
    if (occupied) {
        return;
    }
    Crafty.e("MovementSquare").setPos({x: x, y: y});
}

export function createMovementGrid(player) {
    var playerPos = player.getPos();
    var x = playerPos.x;
    var y = playerPos.y;
    // FIXME Move distance to player attribute
    var maxDistance = 4;
    for (var i = 1; i < maxDistance; i++) {
        for (var j = 1; j + i < maxDistance; j++) {
            createMovementSquare(x + i, y + j);
            createMovementSquare(x + i, y - j);
            createMovementSquare(x - i, y + j);
            createMovementSquare(x - i, y - j);
        }
        createMovementSquare(x + i, y);
        createMovementSquare(x - i, y);
        createMovementSquare(x, y + i);
        createMovementSquare(x, y - i);
    }
};

function isAdjacent(object1, object2) {
    return (Math.abs(object1.getPos().x - object2.getPos().x) <= 1 &&
        Math.abs(object1.getPos().y - object2.getPos().y) <= 1);
}

export function specialAttack(player) {
    for (var i = enemies.length - 1; i >= 0; i--) {
        if (isAdjacent(player, enemies[i])) {
            enemies[i].destroy();
            enemies.splice(i, 1);
        }
    }
}
