/* global Crafty */

"use strict";
let display = null;

Crafty.c("MessageDisplay", {
    required: "2D, DOM, Text, UILayer",

    init: function() {
        this._log = [];
    },

    addMessage: function(message) {
        this._log.push(message);
        // TODO: Display more than one message.
        this.text(message);
    },
});

export function initMessageDisplay(attrs) {
    display = Crafty.e("MessageDisplay");
    display.attr(attrs);
}

export function userMessage(message) {
    // displays a message, no formatting is done here
    display.addMessage(message);
}

export function userError(message) {
    // TODO make it red
    userMessage(message);
}

export function internalError(message) {
    Crafty.error(message);
}

export function debugLog(message) {
    Crafty.log(message);
}
