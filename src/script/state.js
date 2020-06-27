// Module for storing globals used by more than one module.

import {
    ClickEnum,
} from "./consts.js";

export var state = {
    // TODO [#36]: Separate "which action is being targeted" from the rest of
    // clickType
    clickType: ClickEnum.DEFAULT,

    isInDialogue: false,
};
