/* global Crafty */

"use strict";

export function getMessageDisplay() {
    return Crafty.e("MessageDisplay");
}

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

