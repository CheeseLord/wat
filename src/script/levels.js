/* global Crafty */

import {
    createPlayerCharacters,
} from "./characters.js";
import {
    updateMapForNewLevel,
} from "./geometry.js";
import {
    MeleeAttackAction,
    MoveAction,
} from "./new_action.js";

// TODO: Don't build the levels in code.
export function loadLevel1() {
    clearLevel();

    // Ground et al.
    for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 17; x++) {
            if (x === 8 && y === 6) {
                // The lever that opens the door.
                Crafty.e("Lever")
                        .initPos({x: x, y: y})
                        .setIdString("DoorControl");
            } else if (x === 1 && y === 1) {
                // A second lever, which doesn't open the door.
                Crafty.e("Lever")
                        .initPos({x: x, y: y});
            } else if (x === 9 && y === 5) {
                Crafty.e("Door")
                        .initPos({x: x, y: y})
                        .bind("Interact", function(evtData) {
                            if (evtData.idString === "DoorControl") {
                                this.toggleOpen();
                            }
                        });
            } else if (x === 0 || x === 9 || x === 16 || y === 0 || y === 10) {
                // TODO: Some other sort of walls?
                Crafty.e("Tree").initPos({x: x, y: y});
            }
            Crafty.e("Ground").initPos({x: x, y: y});
        }
    }

    // Player characters
    let playerCharacters = createPlayerCharacters();
    for (let i = 0; i < playerCharacters.length; i++) {
        let character = playerCharacters[i];
        character.initPos({x: 2, y: 2 + 2 * i});
    }

    // Enemies
    let enemyPositions = [
        {team: 1, pos: {x:  6, y:  3}},
        {team: 1, pos: {x:  6, y:  5}},
        {team: 1, pos: {x:  6, y:  7}},
        {team: 2, pos: {x: 12, y:  2}},
        {team: 2, pos: {x: 14, y:  3}},
        {team: 2, pos: {x: 12, y:  4}},
        {team: 2, pos: {x: 12, y:  6}},
        {team: 2, pos: {x: 14, y:  7}},
        {team: 2, pos: {x: 12, y:  8}},
    ];
    for (let i = 0; i < enemyPositions.length; i++) {
        let team = enemyPositions[i].team;
        let pos  = enemyPositions[i].pos;
        Crafty.e("Enemy")
                .initPos(pos)
                .setTeam(team)
                .maxHealth(10)
                .setActions([
                    MoveAction,
                    MeleeAttackAction,
                ]);
    }

    // Finish up.
    updateMapForNewLevel();
}

export function loadLevel2() {
    clearLevel();

    // Ground
    for (let x = 0; x < 40; x++) {
        for (let y = 0; y < 40; y++) {
            Crafty.e("Ground").initPos({x: x, y: y});
        }
    }

    // Trees
    for (let x = 0; x < 40; x++) {
        for (let y = 0; y < 40; y++) {
            if (x === 0 || x === 39 || y === 0 || y === 39) {
                Crafty.e("Tree").initPos({x: x, y: y});
            } else if (x === 22 && y >= 24) {
                Crafty.e("Tree").initPos({x: x, y: y});
            } else if (x === 23 && y >= 25) {
                Crafty.e("Tree").initPos({x: x, y: y});
            } else if (x === 28 && y >= 24) {
                Crafty.e("Tree").initPos({x: x, y: y});
            } else if (x === 27 && y >= 25) {
                Crafty.e("Tree").initPos({x: x, y: y});
            }
        }
    }

    // Interactables
    Crafty.e("Lever")
            .initPos({x: 6, y: 6})
            .setIdString("DoorControl");
    for (let x = 23; x < 28; x++) {
        Crafty.e("Door")
                .initPos({x: x, y: 24})
                .bind("Interact", function(evtData) {
                    if (evtData.idString === "DoorControl") {
                        this.toggleOpen();
                    }
                });
    }

    // Player characters
    let playerCharacters = createPlayerCharacters();
    for (let i = 0; i < playerCharacters.length; i++) {
        let character = playerCharacters[i];
        character.initPos({x: 9 + i % 2, y: 9 + Math.floor(i / 2)});
    }

    // Enemies
    let enemyPositions = [
        {team: 1, pos: {x:  2, y:  4}},
        {team: 1, pos: {x:  2, y:  8}},
        {team: 1, pos: {x:  3, y:  4}},
        {team: 1, pos: {x:  3, y:  9}},
        {team: 1, pos: {x:  4, y:  5}},
        {team: 1, pos: {x:  4, y:  7}},
        {team: 1, pos: {x:  4, y: 13}},
        {team: 1, pos: {x:  5, y: 11}},
        {team: 1, pos: {x:  6, y:  3}},
        {team: 1, pos: {x:  6, y: 14}},
        {team: 1, pos: {x: 10, y:  3}},
        {team: 1, pos: {x: 11, y:  2}},
        {team: 1, pos: {x: 11, y:  4}},
        {team: 1, pos: {x: 14, y:  3}},
        {team: 1, pos: {x: 14, y:  8}},
    ];
    for (let i = 0; i < enemyPositions.length; i++) {
        let team = enemyPositions[i].team;
        let pos  = enemyPositions[i].pos;
        Crafty.e("Enemy")
                .initPos(pos)
                .setTeam(team)
                .maxHealth(10)
                .setActions([
                    MoveAction,
                    MeleeAttackAction,
                ]);
    }

    // Finish up.
    updateMapForNewLevel();
}

function clearLevel() {
    // TODO: Make a component for things that need cleaning.
    Crafty("GridObject").each(function() {
        this.destroy();
    });
}

