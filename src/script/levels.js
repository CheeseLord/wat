/* global $ */
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
} from "./action_type.js";

export function loadLevel(path, callback) {
    $.getJSON(path, function(json) {
        clearLevel();

        // Create the ground.
        for (let x = 0; x < json.width; x++) {
            for (let y = 0; y < json.height; y++) {
                Crafty.e("Ground").initPos({x: x, y: y});
            }
        }

        // Unpack the player characters.
        let thing = json.characters;
        let playerCharacters = createPlayerCharacters();
        for (let i = 0; i < playerCharacters.length; i++) {
            let character = playerCharacters[i];
            character.initPos({x: thing[i].x, y: thing[i].y});
        }

        // Unpack the entities.
        for (let i = 0; i < json.entities.length; i++) {
            let desc = json.entities[i];
            let entity = Crafty.e(desc.type).initPos({x: desc.x, y: desc.y});

            if (desc.type === "Door") {
                for (let j = 0; j < desc.events.length; j++) {
                    entity.bind("Interact", function(evtData) {
                        if (evtData.idString === desc.events[j]) {
                            this.toggleOpen();
                        }
                    });
                }
            } else if (desc.type === "Lever") {
                // TODO: Handle multiple events.
                if (desc.events) {
                    entity.setIdString(desc.events[0]);
                }
            } else if (desc.type === "Enemy") {
                entity
                        .setTeam(desc.team)
                        .maxHealth(10)
                        .setActions([
                            MoveAction,
                            MeleeAttackAction,
                        ]);
            }
        }

        finalizeLevel();

        // FIXME: This shouldn't be a callback.
        callback(json.firstTeam);
    });
}

export function loadLevel1(callback) {
    // TODO: Factor out path to levels.
    loadLevel("../levels/level1.json", callback);
}

export function loadLevel2(callback) {
    // TODO: Factor out path to levels.
    loadLevel("../levels/level2.json", callback);
}

function clearLevel() {
    // TODO: Make a component for things that need cleaning.
    Crafty("GridObject").each(function() {
        this.destroy();
    });
}

function finalizeLevel() {
    Crafty("StaticObject").each(function() {
        this.finalize();
    });
    updateMapForNewLevel();
}

