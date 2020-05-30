/* global Crafty */

"use strict";
let dialogueDisplay = null;
let dialogueQueue = [];
let dialogueBackground = null;

Crafty.c("DialogueDisplay", {
    required: "2D, DOM, Text, UILayer",

    init: function() {
        this._log = [];
    },

    addDialogue: function(character, message) {
        dialogueQueue.push([character, message]);
    },

    advanceDialogue: function() {
        if (dialogueQueue.length() === 0) {
            hideDialogue();
        } else {
            showDialogue();
        }
        let dialogue = dialogueQueue.pop();
        let character = dialogue[0];
        let message = dialogue[1];
        this._log.push(message);
        this.text(character.name + ":\n\t" + message);
    },
});

export function initDialogueDisplay(attrs) {
    dialogueBackground = Crafty.e("2D, UILayer, Color")
            .color("#333");
    dialogueBackground.attr(attrs);
    dialogueDisplay = Crafty.e("DialogueDisplay");
    dialogueDisplay.attr(attrs);
    dialogueDisplay.textColor("#eeeeee00");
    dialogueDisplay.textAlign("left");
    hideDialogue();
}

export function addDialogue(character, message) {
    // displays a message, no formatting is done here
    dialogueDisplay.addDialogue(character, message);
}

export function advanceDialogue() {
    dialogueDisplay.advanceDialogue();
}

function hideDialogue() {
    dialogueDisplay.visible = false;
    dialogueBackground.visible = false;
}

function showDialogue() {
    dialogueDisplay.visible = true;
    dialogueBackground.visible = true;
}
