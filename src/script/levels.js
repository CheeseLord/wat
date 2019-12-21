/* global Crafty */

import {
    readyCharacters,
    startTeam,
} from "./action.js";
import {
    updateMapForNewLevel,
} from "./geometry.js";
import {
    assert,
} from "./message.js";

export function loadLevel1() {
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
                Crafty.e("Lever").initPos({x: x, y: y});
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
    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 2})
            .setName_("Not Greg")
            .maxHealth(15)
            .setSpeed(2)
            .setTeam(0)
            .setAnimation(0, 4);

    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 4})
            .setName_("Also Not Greg")
            .maxHealth(15)
            .setSpeed(4)
            .setTeam(0)
            .setAnimation(1, 4);

    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 6})
            .setName_("Not Joel")
            .maxHealth(15)
            .setSpeed(4)
            .setTeam(0)
            .setAnimation(2, 4);

    Crafty.e("SpriteCharacter, anim_start")
            .initPos({x: 2, y: 8})
            .setName_("Samson")
            .maxHealth(15)
            .setSpeed(8)
            .setTeam(0)
            .setAnimation(3, 4);

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
    startTeam(0);
    assert(readyCharacters.length > 0);
}
