/* global Crafty */

"use strict";

import {
    ANIM_DUR_CENTER_TURN,
    ANIM_DUR_HALF_ATTACK,
    ANIM_DUR_MOVE,
    ANIM_DUR_PAUSE_BW_MOV_ATK,
    ANIM_DUR_STEP,
    ATTACK_DAMAGE,
    AutoActionEnum,
    SPECIAL_ATTACK_DAMAGE,
    Highlight,
    MOVE_RANGE,
    NUM_TEAMS,
    MENU_WIDTH,
    StateEnum,
} from "./consts.js";
import {
    canMoveTo,
    findPaths,
    getPath,
    isAdjacent,
    isReachable,
    midpoint,
} from "./geometry.js";
import {
    doAnimate,
    parallelAnimations,
    pauseAnimation,
    seriesAnimations,
    tweenAnimation,
} from "./animation.js";

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
export function getReadyCharacters() { return readyCharacters; }
export function getCurrentTeam() { return currentTeam; }

///////////////////////////////////////////////////////////////////////////////
// Action handlers

export function doMove(evt, x, y) {
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
    } else if (!canMoveTo(theMap, destPos)) {
        reportUserError("You can't move that far.");
        return;
    } else if (!(evt.target && evt.target.has("Ground"))) {
        reportUserError("That's not a tile.");
        return;
    }

    let path = getPath(theMap, selectedPlayer.getPos(), destPos);
    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedPlayer, function() {
            selectedPlayer.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    doAnimate(seriesAnimations(anims), function() {
        Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
        setGlobalState(StateEnum.DEFAULT);
        endCharacter(selectedPlayer);
    });
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

export function doSwap(evt, x, y) {
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
    doAnimate(
        parallelAnimations([
            tweenAnimation(selectedPlayer, function() {
                selectedPlayer.animateTo(clickPos, ANIM_DUR_MOVE);
            }),
            tweenAnimation(evt.target, function() {
                evt.target.animateTo(selectPos, ANIM_DUR_MOVE);
            }),
        ]),
        function() { endCharacter(selectedPlayer); }
    );
}

export function doInteract(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_INTERACT);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        return;
    } else if (evt.target === null) {
        reportUserError("Nothing there to interact with.");
        return;
    } else if (!evt.target.has("Interactable")) {
        reportUserError("Can't interact with that.");
        return;
    }

    // Do a move-and-interact.
    // TODO: Wait, we really don't already have a map?
    let theMap = findPaths(selectedPlayer.getPos(), MOVE_RANGE);
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedPlayer.getPos(), destPos);
    if (path === null) {
        reportUserError("Can't reach that to interact with it.");
        return;
    }
    // assert(path.length > 1);
    path.pop();

    // TODO: Refactor with doMove.
    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedPlayer, function() {
            selectedPlayer.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    // Need to close over evt.target rather than evt.
    let target = evt.target;
    // TODO some sort of animation for the interaction itself?
    doAnimate(seriesAnimations(anims), function() {
        target.interact(selectedPlayer);

        Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
        setGlobalState(StateEnum.DEFAULT);
        endCharacter(selectedPlayer);
    });
}

export function doAttack(evt, x, y) {
    // assert(getGlobalState() === StateEnum.PLAYER_ATTACK);
    if (!selectedPlayer) {
        // assert(false); -- Don't think this can happen?
        return;
    } else if (evt.target === null) {
        reportUserError("No enemy there.");
        return;
    } else if (!evt.target.has("Character")) {
        reportUserError("Can't attack non-character.");
        return;
    } else if (evt.target.team === currentTeam) {
        reportUserError("Can't attack friendly unit.");
        return;
    }
    let theMap = findPaths(selectedPlayer.getPos(), MOVE_RANGE);
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedPlayer.getPos(), destPos);
    if (path === null) {
        reportUserError("Can't reach that to attack it.");
        return;
    }
    let moveToPos = selectedPlayer.getPos();
    if (path.length > 1) {
        path.pop();
        moveToPos = path[path.length - 1];
    } else {
        // assert(false);
    }

    Crafty.log(`${selectedPlayer.name_} moved to ` +
        `(${moveToPos.x}, ${moveToPos.y})`);
    Crafty.log(`${selectedPlayer.name_} attacked ${evt.target.name_}`);

    // TODO: Refactor with doMove.
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedPlayer, function() {
            selectedPlayer.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }

    // Pause between move and attack, but only if we actually moved.
    if (anims.length > 0) {
        anims.push(pauseAnimation(ANIM_DUR_PAUSE_BW_MOV_ATK));
    }

    // Add the attack animation, regardless.
    let halfPos = midpoint(moveToPos, evt.target.getPos());
    anims = anims.concat([
        tweenAnimation(selectedPlayer, function() {
            selectedPlayer.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
        }),
        tweenAnimation(selectedPlayer, function() {
            selectedPlayer.animateTo(moveToPos, ANIM_DUR_HALF_ATTACK);
        }),
    ]);

    // Close over a copy of evt.target so we can destroy it at the end of the
    // animation. Empirically if we simply close over evt, sometimes its
    // .target gets set to null by the time we want to destroy it, which was
    // causing the destroy() call to fail.
    let target  = evt.target;

    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    doAnimate(
        seriesAnimations(anims), function() {
            target.takeDamage(ATTACK_DAMAGE);

            Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
            setGlobalState(StateEnum.DEFAULT);
            endCharacter(selectedPlayer);
        }
    );
}

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
    updateAutoActions(player);
    createMovementGrid(player);
}

export function deselectPlayer() {
    clearAutoActions();

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
            if (this.autoAction === AutoActionEnum.MOVE) {
                this.enableHighlight(Highlight.REACHABLE);
            } else if (this.autoAction === AutoActionEnum.ATTACK) {
                this.enableHighlight(Highlight.ATTACKABLE);
            } else if (this.autoAction === AutoActionEnum.INTERACT) {
                this.enableHighlight(Highlight.INTERACTABLE);
            } else if (this.autoAction !== AutoActionEnum.NONE) {
                // assert(false);
            }
        }
    });
};

export function specialAttack(player) {
    Crafty("Character").each(function() {
        if (this.team !== player.team &&
                isAdjacent(player.getPos(), this.getPos())) {
            this.takeDamage(SPECIAL_ATTACK_DAMAGE);
        }
    });
}

export function canAttack(character, target) {
    return target.has("Character") && target.team !== character.team;
}

export function canInteract(character, target) {
    return target.has("Interactable");
}

export function updateAutoActions(character) {
    Crafty("GridObject").each(function() {
        if (canInteract(character, this)) {
            this.autoAction = AutoActionEnum.INTERACT;
        } else if (canAttack(character, this)) {
            this.autoAction = AutoActionEnum.ATTACK;
        } else if (!this.blocksMovement) {
            this.autoAction = AutoActionEnum.MOVE;
        } else {
            this.autoAction = AutoActionEnum.NONE;
        }
    });
}

export function clearAutoActions() {
    Crafty("GridObject").each(function() {
        this.autoAction = AutoActionEnum.NONE;
    });
}

