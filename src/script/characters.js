/* global Crafty */

import {
    FireballSpellAction,
    InteractAction,
    MeleeAttackAction,
    MoveAction,
    RangedAttackAction,
    SpecialAttackAction,
    SwapPlacesAction,
} from "./action_type.js";

export function createPlayerCharacters() {
    return [
        // Ranged DPS
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Not Greg")
                .maxHealth(10)
                .setSpeed(6)
                .setTeam(0)
                .setAnimation(0, 4)
                .setActions([
                    MoveAction,
                    RangedAttackAction,
                    InteractAction,
                ]),

        // Melee tank
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Also Not Greg")
                .maxHealth(20)
                .setSpeed(3)
                .setTeam(0)
                .setAnimation(1, 4)
                .setActions([
                    MoveAction,
                    MeleeAttackAction,
                    InteractAction,
                ]),

        // Melee DPS
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Not Joel")
                .maxHealth(15)
                .setSpeed(5)
                .setTeam(0)
                .setAnimation(2, 4)
                .setActions([
                    MoveAction,
                    MeleeAttackAction,
                    SpecialAttackAction,
                    InteractAction,
                ]),

        // Mage
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Samson")
                .maxHealth(8)
                .setSpeed(8)
                .setTeam(0)
                .setAnimation(3, 4)
                .setActions([
                    MoveAction,
                    SwapPlacesAction,
                    SpecialAttackAction,
                    FireballSpellAction,
                    InteractAction,
                ]),
    ];
}
