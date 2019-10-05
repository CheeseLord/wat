/* global Crafty */

"use strict";

import {
    ANIM_DUR_CENTER_TURN,
    ANIM_DUR_HALF_ATTACK,
    ANIM_DUR_MOVE,
    ANIM_DUR_PAUSE_BW_MOV_ATK,
    ANIM_DUR_STEP,
    ATTACK_DAMAGE_MIN,
    ATTACK_DAMAGE_MAX,
    AutoActionEnum,
    SPECIAL_ATTACK_DAMAGE_MIN,
    SPECIAL_ATTACK_DAMAGE_MAX,
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
import {
    assert,
    debugLog,
    internalError,
    userError,
    userMessage,
} from "./message.js";
import {
    randInt,
} from "./util.js";

export var selectedCharacter;

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
    assert(getGlobalState() === StateEnum.CHARACTER_MOVE ||
           getGlobalState() === StateEnum.CHARACTER_SELECTED);
    if (!selectedCharacter) {
        assert(false);
        internalError("No character selected.");
        return;
    }

    let theMap = findPaths(selectedCharacter.getPos(), MOVE_RANGE);
    let destPos = {x: x, y: y};

    if (evt.target && evt.target.blocksMovement) {
        userError("Can't move there; something's in the way.");
        return;
    } else if (!canMoveTo(theMap, destPos)) {
        userError("You can't move that far.");
        return;
    } else if (!(evt.target && evt.target.has("Ground"))) {
        userError("That's not a tile.");
        return;
    }

    let path = getPath(theMap, selectedCharacter.getPos(), destPos);
    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    doAnimate(seriesAnimations(anims), function() {
        Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
        setGlobalState(StateEnum.DEFAULT);
        endCharacter(selectedCharacter);
    });
}

function highlightPath(path) {
    for (var i = 0; i < path.length; i++) {
        Crafty("Ground").each(function() {
            if (this.getPos().x === path[i].x &&
                    this.getPos().y === path[i].y) {
                if (i === path.length - 1) {
                    this.enableHighlight(Highlight.ANIM_MOVE_END);
                } else {
                    this.enableHighlight(Highlight.ANIM_MOVE_MIDDLE);
                }
            }
        });
    }
}

export function doSwap(evt, x, y) {
    assert(getGlobalState() === StateEnum.CHARACTER_SWAP);
    if (!selectedCharacter) {
        assert(false);
        internalError("No character selected.");
        return;
    }

    if (evt.target === null) {
        userError("There's nothing there to swap with.");
        return;
    } else if (!evt.target.has("Character")) {
        userError("Can't swap with non-character.");
        return;
    } else if (evt.target.team !== currentTeam) {
        userError("Cannot swap with other player's unit.");
        return;
    } else if (evt.target === selectedCharacter) {
        userError("Cannot swap character with self.");
        return;
    }

    // Swap positions of clicked character and selectedCharacter.
    Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
    setGlobalState(StateEnum.DEFAULT);

    let selectPos = selectedCharacter.getPos();
    let clickPos  = evt.target.getPos();
    doAnimate(
        parallelAnimations([
            tweenAnimation(selectedCharacter, function() {
                selectedCharacter.animateTo(clickPos, ANIM_DUR_MOVE);
            }),
            tweenAnimation(evt.target, function() {
                evt.target.animateTo(selectPos, ANIM_DUR_MOVE);
            }),
        ]),
        function() { endCharacter(selectedCharacter); }
    );
}

export function doInteract(evt, x, y) {
    if (!selectedCharacter) {
        assert(false);
        return;
    } else if (evt.target === null) {
        userError("Nothing there to interact with.");
        return;
    } else if (!evt.target.has("Interactable")) {
        userError("Can't interact with that.");
        return;
    }

    // Do a move-and-interact.
    // TODO: Wait, we really don't already have a map?
    let theMap = findPaths(selectedCharacter.getPos(), MOVE_RANGE);
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedCharacter.getPos(), destPos);
    if (path === null) {
        userError("Can't reach that to interact with it.");
        return;
    }
    assert(path.length > 1);
    path.pop();

    // TODO: Refactor with doMove.
    setGlobalState(StateEnum.ANIMATING);
    highlightPath(path);
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }
    // Need to close over evt.target rather than evt.
    let target = evt.target;
    // TODO some sort of animation for the interaction itself?
    doAnimate(seriesAnimations(anims), function() {
        target.interact(selectedCharacter);

        Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
        setGlobalState(StateEnum.DEFAULT);
        endCharacter(selectedCharacter);
    });
}

export function doAttack(evt, x, y) {
    if (!selectedCharacter) {
        assert(false);
        return;
    } else if (evt.target === null) {
        userError("No enemy there.");
        return;
    } else if (!evt.target.has("Character")) {
        userError("Can't attack non-character.");
        return;
    } else if (evt.target.team === currentTeam) {
        userError("Can't attack friendly unit.");
        return;
    }
    let theMap = findPaths(selectedCharacter.getPos(), MOVE_RANGE);
    let destPos = {x: x, y: y};
    let path = getPath(theMap, selectedCharacter.getPos(), destPos);
    if (path === null) {
        userError("Can't reach that to attack it.");
        return;
    }
    let moveToPos = selectedCharacter.getPos();
    if (path.length > 1) {
        path.pop();
        moveToPos = path[path.length - 1];
    } else {
        assert(false);
    }

    userMessage(`${selectedCharacter.name_} moved to ` +
        `(${moveToPos.x}, ${moveToPos.y})`);
    userMessage(`${selectedCharacter.name_} attacked ${evt.target.name_}`);

    // TODO: Refactor with doMove.
    let anims = [];
    for (let i = 1; i < path.length; i++) {
        anims.push(tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(path[i], ANIM_DUR_STEP);
        }));
    }

    // Pause between move and attack, but only if we actually moved.
    if (anims.length > 0) {
        anims.push(pauseAnimation(ANIM_DUR_PAUSE_BW_MOV_ATK));
    }

    // Add the attack animation, regardless.
    let halfPos = midpoint(moveToPos, evt.target.getPos());
    anims = anims.concat([
        tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(halfPos, ANIM_DUR_HALF_ATTACK);
        }),
        tweenAnimation(selectedCharacter, function() {
            selectedCharacter.animateTo(moveToPos, ANIM_DUR_HALF_ATTACK);
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
            target.takeDamage(randInt(ATTACK_DAMAGE_MIN, ATTACK_DAMAGE_MAX));

            Crafty.s("ButtonMenu").clearMenu(); // TODO UI call instead?
            setGlobalState(StateEnum.DEFAULT);
            endCharacter(selectedCharacter);
        }
    );
}

///////////////////////////////////////////////////////////////////////////////
// "Milestones" in turn order

export function startTeam(team) {
    debugLog(`Starting turn for team ${team}.`);

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
        readyCharacters[i].enableHighlight(Highlight.AVAILABLE_CHARACTER);
    }
    // TODO: Why does startCharacter not call selectCharacter? Who calls it
    // instead?
    setFocusOn(character);
    // TODO: Should we select them, too?
}

export function endCharacter(character) {
    deselectCharacter();

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
    debugLog(`Reached end of turn for team ${currentTeam}.`);

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
        assert(maxTries === 0);
        // Eventually, this should probably be detected and result in something
        // actually happening in-game. (Maybe a game-over screen since your
        // whole team is dead?)
        internalError("There's no one left to act.");
    }
}

///////////////////////////////////////////////////////////////////////////////
// Menu-related action helpers (and some misc?)

export function selectCharacter(character) {
    deselectCharacter();
    selectedCharacter = character;
    selectedCharacter.enableHighlight(Highlight.SELECTED_CHARACTER);
    updateAutoActions(character);
    createMovementGrid(character);
}

export function deselectCharacter() {
    clearAutoActions();

    if (selectedCharacter) {
        selectedCharacter.disableHighlight(Highlight.SELECTED_CHARACTER);
        selectedCharacter = null;
        // TODO: Probably the menu table should instead define the state we
        // transition to on CLEAR_MENU?
        setGlobalState(StateEnum.DEFAULT);
    }
    // Clear movement grid.
    clearHighlightType(Highlight.CAN_MOVE);
    clearHighlightType(Highlight.CAN_ATTACK);
    clearHighlightType(Highlight.CAN_INTERACT);
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

function createMovementGrid(character) {
    Crafty("GridObject").each(function() {
        // Note: don't need to check isReachable here, since we only set
        // autoActions on objects that are in range.
        if (this.autoAction === AutoActionEnum.MOVE) {
            this.enableHighlight(Highlight.CAN_MOVE);
        } else if (this.autoAction === AutoActionEnum.ATTACK) {
            this.enableHighlight(Highlight.CAN_ATTACK);
        } else if (this.autoAction === AutoActionEnum.INTERACT) {
            this.enableHighlight(Highlight.CAN_INTERACT);
        } else if (this.autoAction !== AutoActionEnum.NONE) {
            assert(false);
        }
    });
}

export function specialAttack(character) {
    Crafty("Character").each(function() {
        if (this.team !== character.team &&
                isAdjacent(character.getPos(), this.getPos())) {
            this.takeDamage(randInt(SPECIAL_ATTACK_DAMAGE_MIN,
                SPECIAL_ATTACK_DAMAGE_MAX));
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
    let characterPos = character.getPos();
    let theMap = findPaths(characterPos, MOVE_RANGE);
    Crafty("GridObject").each(function() {
        let canReach = isReachable(theMap, this.getPos());
        if (canReach && canInteract(character, this)) {
            this.autoAction = AutoActionEnum.INTERACT;
        } else if (canReach && canAttack(character, this)) {
            this.autoAction = AutoActionEnum.ATTACK;
        } else if (canMoveTo(theMap, this.getPos())) {
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

