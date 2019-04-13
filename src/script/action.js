/* global Crafty */

"use strict";

import {
    ANIM_DUR_CENTER_TURN,
    ANIM_DUR_HALF_ATTACK,
    ANIM_DUR_MOVE,
    MapGrid,
    MOVE_RANGE,
    NUM_TEAMS,
    MENU_WIDTH,
    StateEnum,
} from "./consts.js";
import {
    getDistance,
    isAdjacent,
} from "./util.js";
import {doMenu} from "./ui.js";

export var selectedPlayer;

// In JavaScript, if you import a variable and then assign a new value to it,
// other modules don't see the new value. Therefore, instead of allowing other
// modules import globalState directly, have them access it through
// {get,set}GlobalState.
var globalState = StateEnum.DEFAULT;
export function getGlobalState() { return globalState; }
export function setGlobalState(newState) { globalState = newState; }

export var readyCharacters = [];
export var currentTeam = 0;

Crafty.c("MovementSquare", {
    required: "GridObject, Color, Mouse",

    init: function() {
        this.color("#555555", 0.5);
    },
});

///////////////////////////////////////////////////////////////////////////////
// Action handlers

function doSelectPlayer(evt, x, y) {
    // assert(getGlobalState() === StateEnum.DEFAULT ||
    //        getGlobalState() === StateEnum.PLAYER_SELECTED);

    if (evt.target && evt.target.has("Character")) {
        if (evt.target.team !== currentTeam) {
            reportUserError("Character is on another team");
            return;
        }
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
    if (evt.target && evt.target.has("Character")) {
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

    if (evt.target && evt.target.has("SpaceFillingObject")) {
        reportUserError("Can't move there; something's in the way.");
        return;
    } else if (getDistance({x: x, y: y}, selectedPlayer.getPos()) >
            MOVE_RANGE) {
        reportUserError("You can't move that far.");
        return;
    } else if (!(evt.target && (evt.target.has("MovementSquare") ||
            evt.target.has("Ground")))) {
        reportUserError("That's not a tile.");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    setGlobalState(StateEnum.DEFAULT);
    removeMovementSquares();
    selectedPlayer.animateTo({x: x, y: y}, ANIM_DUR_MOVE);
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
    } else if (!evt.target.has("Character")) {
        reportUserError("Can't swap with non-player.");
        return;
    } else if (evt.target.team !== currentTeam) {
        reportUserError("Cannot swap with other player's unit.");
        return;
    } else if (evt.target === selectedPlayer) {
        reportUserError("Cannot swap player with self.");
        return;
    }

    // Swap positions of clicked player and selectedPlayer.
    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    setGlobalState(StateEnum.DEFAULT);

    let selectPos = selectedPlayer.getPos();
    let clickPos  = evt.target.getPos();
    evt.target.animateTo(selectPos, ANIM_DUR_MOVE);
    selectedPlayer.animateTo(clickPos, ANIM_DUR_MOVE);
    selectedPlayer.one("TweenEnd", function() {
        characterActed(selectedPlayer);
    });
}

function doAttack(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_ATTACK);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        return;
    } else if (evt.target === null) {
        reportUserError("No enemy there.");
        return;
    } else if (Math.abs(selectedPlayer.getPos().x - x) > 1 ||
            Math.abs(selectedPlayer.getPos().y - y) > 1) {
        reportUserError("Target not adjacent.");
        return;
    } else if (!evt.target.has("Character")) {
        reportUserError("Can't attack non-character.");
        return;
    } else if (evt.target.team === currentTeam) {
        reportUserError("Can't attack friendly unit.");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    setGlobalState(StateEnum.ANIMATING);
    // Close over a copy of evt.target so we can destroy it at the end of the
    // animation. Empirically if we simply close over evt, sometimes its
    // .target gets set to null by the time we want to destroy it, which was
    // causing the destroy() call to fail.
    let target  = evt.target;
    let currPos = selectedPlayer.getPos();
    let halfPos = midpoint(currPos, evt.target.getPos());
    selectedPlayer.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
    selectedPlayer.one("TweenEnd", function() {
        // TODO: Better way to chain these together?
        selectedPlayer.animateTo(currPos, ANIM_DUR_HALF_ATTACK);
        selectedPlayer.one("TweenEnd", function() {
            target.destroy();
            setGlobalState(StateEnum.DEFAULT);
            characterActed(selectedPlayer);
        });
    });
}

function midpoint(pos1, pos2) {
    return {x: 0.5 * (pos1.x + pos2.x), y: 0.5 * (pos1.y + pos2.y)};
}

///////////////////////////////////////////////////////////////////////

// Generic handler for clicks on the world view.
export function worldClickHandler(evt) {
    let x = Math.floor(evt.realX / MapGrid.tile.width);
    let y = Math.floor(evt.realY / MapGrid.tile.height);
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
    if (readyCharacters.length === 0) {
        endTurn();
    }
    if (readyCharacters.length > 0) {
        setFocusOn(readyCharacters[0]);
    }
}

function setFocusOn(character) {
    Crafty.viewport.clampToEntities = false;
    Crafty.one("CameraAnimationDone", function() {
        Crafty.viewport.follow(character, MENU_WIDTH / 2, 0);
    });
    centerCameraOn(character, ANIM_DUR_CENTER_TURN);
}

function centerCameraOn(target, time) {
    var x = target.x + Crafty.viewport.x;
    var y = target.y + Crafty.viewport.y;
    // TODO Do we want to camera center based on the grid
    //      or based on the center of characters
    var midX = target.w / 2;
    var midY = target.h / 2;

    var centX = ((Crafty.viewport.width + MENU_WIDTH) / 2) /
        Crafty.viewport._scale;
    var centY = Crafty.viewport.height / 2 / Crafty.viewport._scale;
    var newX = x + midX - centX;
    var newY = y + midY - centY;

    Crafty.viewport.pan(newX, newY, time);
}

export function endTurn() {
    Crafty.log(`Reached end of turn for team ${currentTeam}.`);
    let team = currentTeam;
    let maxTries = NUM_TEAMS;
    // If the next team has no one on it to act, skip over them. Repeat until
    // we find a team that has someone ready to act, or until we've tried all
    // teams.
    do {
        team = (team + 1) % NUM_TEAMS;
        newTurn(team);
        maxTries--;
    } while (readyCharacters.length === 0 && maxTries > 0);

    if (readyCharacters.length === 0) {
        // Eventually, this should probably be detected and result in something
        // actually happening in-game. (Maybe a game-over screen since your
        // whole team is dead?)
        Crafty.error("There's no one left to act.");
    }
}

export function newTurn(team) {
    Crafty.log(`Starting turn for team ${team}.`);

    currentTeam = team;
    readyCharacters = [];
    Crafty("Character").each(function() {
        if (this.team === team) {
            readyCharacters.push(this);
        }
    });
}

function createMovementSquare(x, y) {
    let occupied  = false;
    let hasGround = false;
    Crafty("SpaceFillingObject").each(function() {
        if (this.getPos().x === x && this.getPos().y === y) {
            occupied = true;
        }
    });
    Crafty("Ground").each(function() {
        if (this.getPos().x === x && this.getPos().y === y) {
            hasGround = true;
        }
    });
    if (occupied || !hasGround) {
        return;
    }
    Crafty.e("MovementSquare").setPos({x: x, y: y});
}

export function createMovementGrid(player) {
    var playerPos = player.getPos();
    var x = playerPos.x;
    var y = playerPos.y;
    var maxDistance = MOVE_RANGE;
    for (var i = 1; i <= maxDistance; i++) {
        for (var j = 1; j + i <= maxDistance; j++) {
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

export function specialAttack(player) {
    Crafty("Character").each(function() {
        if (this.team !== player.team &&
                isAdjacent(player.getPos(), this.getPos())) {
            this.destroy();
        }
    });
}
