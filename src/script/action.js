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
    Z_MOVE_SQUARE,
} from "./consts.js";
import {
    createMovementGridPaths,
    isAdjacent,
    midpoint,
} from "./geometry.js";
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

// A map of the level, consisting of only the StaticObjects. This is a 2D
// array, indexed [x][y]. Each element is an object with fields:
//     isBlocked = true if the square is blocked by a StaticObject, so can
//         never be moved into.
//     parent    = null (used by pathfinding)
// Must be initialized whenever a new level is loaded.
export var staticMap = [];

// TODO change MovementSquare to not be a DynamicObject in its own right, but
// instead be a highlight on the existing object. Right now they're the one
// weird exception to the DynamicObject component -- everything else represents
// real objects in the world, but MovementSquares are a purely UI construct.
Crafty.c("MovementSquare", {
    required: "DynamicObject, Color",

    init: function() {
        this.color("#00ff00", 0.25);
        this.attr({z: Z_MOVE_SQUARE});
        this.attr({blocksMovement: false});
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
        // TODO: Also setFocusOn? Or even call out to startCharacter?
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

    let dynamicMap = getDynamicMap();
    createMovementGridPaths(selectedPlayer.getPos(), dynamicMap, MOVE_RANGE);

    if (evt.target && evt.target.blocksMovement) {
        reportUserError("Can't move there; something's in the way.");
        return;
    } else if (dynamicMap[x][y].parent === null) {
        reportUserError("You can't move that far.");
        return;
    } else if (!(evt.target && evt.target.has("Ground"))) {
        reportUserError("That's not a tile.");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    setGlobalState(StateEnum.DEFAULT);
    removeMovementSquares();
    selectedPlayer.animateTo({x: x, y: y}, ANIM_DUR_MOVE);
    selectedPlayer.one("TweenEnd", function() {
        endCharacter(selectedPlayer);
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

    // Wait until _both_ selectedPlayer and evt.target have finished animating.
    // Even though their durations are the same, empirically they don't always
    // finish at exactly the same time.
    let numLeft  = 2;
    let f = function() {
        numLeft -= 1;
        if (numLeft === 0) {
            endCharacter(selectedPlayer);
        }
    };
    selectedPlayer.one("TweenEnd", f);
    evt.target.one("TweenEnd", f);
}

function doAttack(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_ATTACK);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        return;
    } else if (evt.target === null) {
        reportUserError("No enemy there.");
        return;
    } else if (!isAdjacent({x: x, y: y}, selectedPlayer.getPos())) {
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
            endCharacter(selectedPlayer);
        });
    });
}

///////////////////////////////////////////////////////////////////////

// Generic handler for clicks on the world view.
export function worldClickHandler(evt) {
    // TODO: Can't we just use evt.target.getPos()? If there's no target, we
    // sholdn't be doing anything anyway...
    let x = Math.floor(evt.realX / (MapGrid.tile.width + MapGrid.tile.hspace));
    let y = Math.floor(evt.realY /
            (MapGrid.tile.height + MapGrid.tile.vspace));
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
// "Milestones" in turn order

export function startTeam(team) {
    Crafty.log(`Starting turn for team ${team}.`);

    currentTeam = team;
    readyCharacters = [];
    Crafty("Character").each(function() {
        if (this.team === team) {
            this.markReady();
            readyCharacters.push(this);
        }
    });

    if (readyCharacters.length > 0) {
        startCharacter(readyCharacters[0]);
    }
}

function startCharacter(character) {
    setFocusOn(character);
    // TODO: Should we select them, too?
}

export function endCharacter(character) {
    deselectPlayer();

    // Unready the current character.
    character.markUnready();
    let index = readyCharacters.indexOf(character);
    if (index === -1) {
        // TODO: We should never get here, but handle it better anyway.
        return;
    } else {
        readyCharacters.splice(index, 1);
    }

    if (readyCharacters.length > 0) {
        // There are still more characters to move.
        startCharacter(readyCharacters[0]);
    } else {
        // This was the last character on the team; end the team's turn.
        endTeam();
    }
}

export function endTeam() {
    Crafty.log(`Reached end of turn for team ${currentTeam}.`);

    Crafty("Highlightable").each(function() {
        this.markUnready();
    });

    let team = currentTeam;
    let maxTries = NUM_TEAMS;
    // If the next team has no one on it to act, skip over them. Repeat until
    // we find a team that has someone ready to act, or until we've tried all
    // teams.
    do {
        team = (team + 1) % NUM_TEAMS;
        // TODO: Maybe just have startTeam return success or failure? Or maybe
        // put this loop in startTeam?
        startTeam(team);
        maxTries--;
    } while (readyCharacters.length === 0 && maxTries > 0);

    if (readyCharacters.length === 0) {
        // assert(maxTries === 0);
        // Eventually, this should probably be detected and result in something
        // actually happening in-game. (Maybe a game-over screen since your
        // whole team is dead?)
        Crafty.error("There's no one left to act.");
    }
}

///////////////////////////////////////////////////////////////////////////////
// Menu-related action helpers (and some misc?)

export function reportUserError(text) {
    // TODO: Put this somewhere the user will actually see it.
    Crafty.error(text);
}

export function selectPlayer(player) {
    deselectPlayer();
    selectedPlayer = player;
    selectedPlayer.markSelected();
}

export function removeMovementSquares() {
    Crafty("MovementSquare").each(function() {
        this.destroy();
    });
}

export function deselectPlayer() {
    if (selectedPlayer) {
        selectedPlayer.markUnselected();
        selectedPlayer = null;
        // TODO: Probably the menu table should instead define the state we
        // transition to on CLEAR_MENU?
        setGlobalState(StateEnum.DEFAULT);
    }
}

function setFocusOn(character) {
    Crafty.viewport.clampToEntities = false;
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

export function createMovementGrid(player) {
    let playerPos  = player.getPos();
    let dynamicMap = getDynamicMap();
    createMovementGridPaths(playerPos, dynamicMap, MOVE_RANGE);
    for (let x = 0; x < dynamicMap.length; x++) {
        for (let y = 0; y < dynamicMap[x].length; y++) {
            if (dynamicMap[x][y].parent !== null) {
                // TODO show the actual path somehow.
                Crafty.e("MovementSquare").initPos({x: x, y: y});
            }
        }
    }
};

////////////////////////////////////////
// TODO move this stuff somewhere else.

function getDynamicMap() {
    let dynamicMap = [];
    // Clone the staticMap.
    for (let x = 0; x < staticMap.length; x++) {
        dynamicMap.push([]);
        for (let y = 0; y < staticMap[x].length; y++) {
            dynamicMap[x].push({
                isBlocked: staticMap[x][y].isBlocked,
                parent:    staticMap[x][y].parent,
            });
        }
    }

    Crafty("DynamicObject").each(function() {
        if (this.blocksMovement) {
            // TODO bounds check?
            dynamicMap[this.getPos().x][this.getPos().y].isBlocked = true;
        }
    });

    return dynamicMap;
}

export function buildStaticMap() {
    // First compute the bounds, because apparently those aren't recorded
    // anywhere.
    let maxX = 0;
    let maxY = 0;
    Crafty("StaticObject").each(function() {
        let pos = this.getPos();
        if (pos.x > maxX) {
            maxX = pos.x;
        }
        if (pos.y > maxY) {
            maxY = pos.y;
        }
    });

    // Create arrays of the appropriate lengths.
    staticMap = [];
    for (let x = 0; x < maxX; x++) {
        staticMap.push([]);
        for (let y = 0; y < maxY; y++) {
            staticMap[x].push({
                isBlocked: false,
                parent:    null,
            });
        }
    }

    // Fill in the isBlocked values for StaticObjects.
    Crafty("StaticObject").each(function() {
        if (this.blocksMovement) {
            staticMap[this.getPos().x][this.getPos().y].isBlocked = true;
        }
    });
}

// End "TODO move this stuff somewhere else"
////////////////////////////////////////

export function specialAttack(player) {
    Crafty("Character").each(function() {
        if (this.team !== player.team &&
                isAdjacent(player.getPos(), this.getPos())) {
            this.destroy();
        }
    });
}
