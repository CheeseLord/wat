"use strict";

import {
    internalError,
} from "./message.js";

const AnimType = Object.freeze({
    SINGLE:      {},
    NOTHING:     {},
    SYNCHRONOUS: {},
    PAUSE:       {},
    SERIES:      {},
    PARALLEL:    {},
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

///////////////////////////////////////////////////////////////////////////////
// Special cases

// Do nothing
export function nopAnimation() {
    // Note: we could also just use seriesAnimations([]). But not
    // parallelAnimations([]), at least not as it's currently implemented.
    // TODO: Maybe fix that?
    // Note: could also be synchronousAnimation(function() {}).
    return {
        type: AnimType.NOTHING,
    };
}

// Call a function, wait for it to return. Not really an animation (since by
// necessity, the event loop can't run while the function is running), but
// useful for doing quick bookkeeping in the middle of a series of animations
// (for example, to delete particle entities that are no longer wanted).
export function synchronousAnimation(func) {
    return {
        type: AnimType.SYNCHRONOUS,
        func: func,
    };
}

// Wait for duration. Don't create any new animations, but the event loop will
// continue on in the background.
export function pauseAnimation(duration) {
    return {
        type:     AnimType.PAUSE,
        duration: duration,
    };
}

///////////////////////////////////////////////////////////////////////////////
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
    } else if (animDesc.type === AnimType.SYNCHRONOUS) {
        animDesc.func();
        callback();
    } else if (animDesc.type === AnimType.PAUSE) {
        setTimeout(callback, animDesc.duration);
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
        internalError("In doAnimate(): unknown type.");
    }
}

