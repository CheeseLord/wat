/* global Crafty */

"use strict";

const AnimType = Object.freeze({
    NOTHING:  {},
    SINGLE:   {},
    SERIES:   {},
    PARALLEL: {},
});

export function animation(endObj, endEventName, startFunc) {
    return {
        type: AnimType.SINGLE,
        func: startFunc,
        obj:  endObj,
        evt:  endEventName,
    };
}

// Helper since in practice endEventName always seems to be "TweenEnd".
export function tweenAnimation(endObj, startFunc) {
    return animation(endObj, "TweenEnd", startFunc);
}

export function nopAnimation() {
    // Note: we could also just use seriesAnimations([]). But not
    // parallelAnimations([]), at least not as it's currently implemented.
    // TODO: Maybe fix that?
    return {
        type: AnimType.NOTHING,
    };
}

// Combinators
export function seriesAnimations(contents) {
    return {
        type:     AnimType.SERIES,
        contents: contents,
    };
}

export function parallelAnimations(contents) {
    return {
        type:     AnimType.PARALLEL,
        contents: contents,
    };
}

// Main workhorse function to actually do the animations.
export function doAnimate(animDesc, callback) {
    if (animDesc.type === AnimType.SINGLE) {
        animDesc.func();
        animDesc.obj.one(animDesc.evt, callback);
    } else if (animDesc.type === AnimType.NOTHING) {
        callback();
    } else if (animDesc.type === AnimType.SERIES) {
        let f = function(i) {
            if (i < animDesc.contents.length) {
                doAnimate(animDesc.contents[i], function() { f(i + 1); });
            } else {
                callback();
            }
        };
        f(0);
    } else if (animDesc.type === AnimType.PARALLEL) {
        let numLeft = animDesc.contents.length;
        let f = function() {
            numLeft -= 1;
            if (numLeft === 0) {
                callback();
            }
        };

        for (let i = 0; i < animDesc.contents.length; i++) {
            doAnimate(animDesc.contents[i], f);
        }
    } else {
        Crafty.error("Internal error in doAnimate() -- unknown type.");
    }
}

