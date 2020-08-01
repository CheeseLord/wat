/* global Crafty */

"use strict";

import {
    state,
} from "./state.js";
import {
    CutsceneEnum,
} from "./consts.js";

let cutsceneQueue = [];
let cutsceneManager = null;

Crafty.c("CutsceneManager", {
    init: function() {
        this._log = [];
        this.dialogueBackground = Crafty.e("2D, UILayer, Color")
                .color("#333");
        this.dialogueDisplay = Crafty.e("DialogueDisplay");
        this.dialogueDisplay.textColor("#fff");
        this.dialogueDisplay.textAlign("left");
        this.hideDialogue();
    },

    setDialogueAttrs: function(attrs) {
        this.dialogueBackground.attr(attrs);
        this.dialogueDisplay.attr(attrs);
    },

    hideDialogue: function() {
        this.dialogueDisplay.visible = false;
        this.dialogueBackground.visible = false;
    },

    showDialogue: function() {
        this.dialogueDisplay.visible = true;
        this.dialogueBackground.visible = true;
    },

    addDialogue: function(character, message) {
        cutsceneQueue.push([CutsceneEnum.DIALOGUE, character, message]);
    },

    advanceCutscene: function() {
        if (cutsceneQueue.length === 0) {
            this.hideDialogue();
            state.isInCutscene = false;
            return;
        }
        let cutsceneElement = cutsceneQueue.shift();
        state.isInCutscene = true;
        switch (cutsceneElement[0]) {
            case CutsceneEnum.DIALOGUE:
                this.showDialogue();
                let character = cutsceneElement[1];
                let message = cutsceneElement[2];
                this.dialogueDisplay.advanceDialogue(character, message);
                break;
            case CutsceneEnum.ANIMATION:
                // TODO
        }
    },
});

Crafty.c("DialogueDisplay", {
    required: "2D, DOM, Text, UILayer",

    init: function() {
        this._log = [];
    },

    advanceDialogue: function(character, message) {
        this.text(character.name_ + ":<br/>&nbsp;&nbsp;" + message);
    },
});

export function initDialogueDisplay(attrs) {
    cutsceneManager = Crafty.e("CutsceneManager");
    cutsceneManager.setDialogueAttrs(attrs);
}

export function addDialogue(character, message) {
    // displays a message, no formatting is done here
    cutsceneManager.addDialogue(character, message);
}

export function advanceCutscene() {
    cutsceneManager.advanceCutscene();
}
