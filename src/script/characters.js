/* global Crafty */

import {
    ActionType,
} from "./new_action.js";

export function createPlayerCharacters() {
    return [
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Not Greg")
                .maxHealth(15)
                .setSpeed(2)
                .setTeam(0)
                .setAnimation(0, 4)
                .setActions([
                    ActionType.RANGED_ATTACK,
                    ActionType.MOVE,
                    ActionType.INTERACT,
                ]),

        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Also Not Greg")
                .maxHealth(15)
                .setSpeed(4)
                .setTeam(0)
                .setAnimation(1, 4)
                .setActions([
                    ActionType.SWAP_PLACES,
                    ActionType.RANGED_ATTACK,
                ]),

        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Not Joel")
                .maxHealth(15)
                .setSpeed(4)
                .setTeam(0)
                .setAnimation(2, 4)
                .setActions([
                    ActionType.SWAP_PLACES,
                    ActionType.MOVE,
                    ActionType.SPECIAL_ATTACK,
                ]),

        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Samson")
                .maxHealth(15)
                .setSpeed(8)
                .setTeam(0)
                .setAnimation(3, 4)
                .setActions([
                    ActionType.RANGED_ATTACK,
                    ActionType.MOVE,
                    ActionType.ATTACK,
                ]),
    ];
}
