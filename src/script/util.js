"use strict";

// Divide numer/denom. Return a value capped between 0 and 1, inclusive.
export function getProportion(numer, denom) {
    let prop = numer / denom;
    if (isNaN(prop)) {
        // Zero divided by zero.
        return 0;
    } else if (prop < 0) {
        return 0;
    } else if (prop > 1) {
        return 1;
    } else {
        return prop;
    }
}

// Return random integer between low and high, inclusive on both ends.
export function randInt(low, high) {
    let numVals = (high - low + 1);
    return Math.floor(Math.random() * numVals) + low;
}
