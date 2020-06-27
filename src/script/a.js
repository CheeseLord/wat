export var aAssign = 1;
export var bAssign = 1;
export var aField = {x: 1};
export var bField = {x: 1};

export function showVarsA() {
    console.log(`[a.js] aAssign==${aAssign} bAssign==${bAssign} ` +
                `aField.x==${aField.x} bField.x==${bField.x}`);
}

export function doAssignA() {
    console.log(`[a.js] aAssign = 2`);
    aAssign = 2;
}

export function doFieldA() {
    console.log(`[a.js] aField.x = 2`);
    aField.x = 2;
}
