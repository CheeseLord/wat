/* global Crafty */

"use strict";

import {
    ANIM_DUR_CENTER_TURN,
    ANIM_DUR_HALF_ATTACK,
    ANIM_DUR_MOVE,
    ANIM_DUR_STEP,
    Highlight,
    MapGrid,
    MOVE_RANGE,
    NUM_TEAMS,
    MENU_WIDTH,
    StateEnum,
} from "./consts.js";
import {
    findPaths,
    getPath,
    isAdjacent,
    isReachable,
    midpoint,
} from "./geometry.js";
import {doMenu} from "./menu.js";

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

    let theMap = findPaths(selectedPlayer.getPos(), MOVE_RANGE);
    let destPos = {x: x, y: y};

    if (evt.target && evt.target.blocksMovement) {
        reportUserError("Can't move there; something's in the way.");
        return;
    } else if (!isReachable(theMap, destPos)) {
        reportUserError("You can't move that far.");
        return;
    } else if (!(evt.target && evt.target.has("Ground"))) {
        reportUserError("That's not a tile.");
        return;
    }

    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    setGlobalState(StateEnum.DEFAULT);
    let path = getPath(theMap, selectedPlayer.getPos(), destPos);
    highlightPath(path);
    function animate(i) {
        selectedPlayer.animateTo(path[i], ANIM_DUR_STEP);
        selectedPlayer.one("TweenEnd", function() {
            if (i === path.length - 1) {
                endCharacter(selectedPlayer);
            } else {
                animate(i + 1);
            }
        });
    };
    animate(1);
}

function highlightPath(path) {
    for (var i = 0; i < path.length; i++) {
        Crafty("Ground").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                if (i === path.length - 1) {
                    this.enableHighlight(Highlight.ANIM_PATH_END);
                } else {
                    this.enableHighlight(Highlight.ANIM_PATH_MIDDLE);
                }
            }
        });
    };
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
            readyCharacters.push(this);
        }
    });

    if (readyCharacters.length > 0) {
        startCharacter(readyCharacters[0]);
    }
}

function startCharacter(character) {
    clearAllHighlights();
    for (let i = 0; i < readyCharacters.length; i++) {
        readyCharacters[i].enableHighlight(Highlight.AVAILABLE_CHAR);
    }
    // TODO: Why does startCharacter not call selectPlayer? Who calls it
    // instead?
    // (TODO: Also, rename selectPlayer to selectCharacter.)
    setFocusOn(character);
    // TODO: Should we select them, too?
}

export function endCharacter(character) {
    deselectPlayer();

    // Unready the current character.
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
    selectedPlayer.enableHighlight(Highlight.SELECTED_CHAR);
    createMovementGrid(player);
}

export function deselectPlayer() {
    if (selectedPlayer) {
        selectedPlayer.disableHighlight(Highlight.SELECTED_CHAR);
        selectedPlayer = null;
        // TODO: Probably the menu table should instead define the state we
        // transition to on CLEAR_MENU?
        setGlobalState(StateEnum.DEFAULT);
    }
    // Clear movement grid.
    clearHighlightType(Highlight.REACHABLE);
    clearHighlightType(Highlight.ATTACKABLE);
    clearHighlightType(Highlight.INTERACTABLE);
}

function clearHighlightType(hlType) {
    Crafty("GridObject").each(function() {
        this.disableHighlight(hlType);
    });
}
function clearAllHighlights() {
    Crafty("GridObject").each(function() {
        this.clearHighlights();
    });
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

function createMovementGrid(player) {
    let playerPos = player.getPos();
    let theMap = findPaths(playerPos, MOVE_RANGE);
    Crafty("GridObject").each(function() {
        if (isReachable(theMap, this.getPos())) {
            this.enableHighlight(Highlight.REACHABLE);
        }
    });
};

export function specialAttack(player) {
    Crafty("Character").each(function() {
        if (this.team !== player.team &&
                isAdjacent(player.getPos(), this.getPos())) {
            this.destroy();
        }
    });
}
