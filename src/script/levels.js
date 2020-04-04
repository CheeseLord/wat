/* global Crafty */

import {
    updateMapForNewLevel,
} from "./geometry.js";
import {createPlayerCharacters} from "./characters.js";

// TODO: Don't build the level in code.
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
    let ENEMY_POSITIONS = [
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
    for (let i = 0; i < ENEMY_POSITIONS.length; i++) {
        let team = ENEMY_POSITIONS[i].team;
        let pos  = ENEMY_POSITIONS[i].pos;
        Crafty.e("Enemy")
                .initPos(pos)
                .setTeam(team)
                .maxHealth(10);
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

