import {
    aAssign,
    bAssign,
    aField,
    bField,
} from "./a.js";

export function showVarsB() {
    console.log(`[b.js] aAssign==${aAssign} bAssign==${bAssign} ` +
                `aField.x==${aField.x} bField.x==${bField.x}`);
}

export function doAssignB() {
    console.log(`[b.js] bAssign = 2`);
    bAssign = 2;
}

export function doFieldB() {
    console.log(`[b.js] bField.x = 2`);
    bField.x = 2;
}
