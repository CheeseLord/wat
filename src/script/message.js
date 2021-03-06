/* global Crafty */

"use strict";
let display = null;
let displayBackground = null;

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
    displayBackground = Crafty.e("2D, UILayer, Color")
            .color("#eee");
    displayBackground.attr(attrs);
    display = Crafty.e("MessageDisplay");
    display.attr(attrs);
}

export function userMessage(message) {
    // displays a message, no formatting is done here
    display.addMessage(message);
    display.textColor("#000000");
    display.textAlign("center");
}

export function userError(message) {
    display.addMessage(message);
    display.textColor("#ff0000");
    display.textAlign("center");
}

export function debugLog(message) {
    Crafty.log(message);
}

export function internalWarning(message) {
    Crafty.error("Warning: " + message);
}

var haveAlertedForInternalError = false;

export function internalError(message) {
    Crafty.error(message);
    if (!haveAlertedForInternalError) {
        window.alert("An internal error has occurred. See the console for " +
                     "details.");
        haveAlertedForInternalError = true;
    }
}

export function assert(expr) {
    if (!expr) {
        internalError("Assertion failed.");
    }
}

