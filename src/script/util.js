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
