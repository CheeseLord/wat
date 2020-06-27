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
                .setName_("Archie the Archer")
                .maxHealth(10)
                .setSpeed(6)
                .setTeam(0)
                .setAnimation(0, 4)
                .setActions(RangedAttackAction, [
                    MoveAction,
                    InteractAction,
                ]),

        // Melee tank
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Tank You")
                .maxHealth(20)
                .setSpeed(3)
                .setTeam(0)
                .setAnimation(1, 4)
                .setActions(MeleeAttackAction, [
                    MoveAction,
                    InteractAction,
                ]),

        // Melee DPS
        Crafty.e("SpriteCharacter, anim_start")
                .setName_("Hulk Smash")
                .maxHealth(15)
                .setSpeed(5)
                .setTeam(0)
                .setAnimation(2, 4)
                .setActions(MeleeAttackAction, [
                    MoveAction,
                    SpecialAttackAction,
                    InteractAction,
                ]),

        // Mage
        Crafty.e("SpriteCharacter, anim_start")
                // With "You're" spelled out, it's too long and apparently gets
                // silently truncated??
                .setName_("Ur a Lizard, Harry")
                .maxHealth(8)
                .setSpeed(8)
                .setTeam(0)
                .setAnimation(3, 4)
                .setActions(FireballSpellAction, [
                    MoveAction,
                    SwapPlacesAction,
                    SpecialAttackAction,
                    InteractAction,
                ]),
    ];
}
