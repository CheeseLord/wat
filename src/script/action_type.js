"use strict";

import {
    MELEE_ATTACK_DAMAGE_MAX,
    MELEE_ATTACK_DAMAGE_MIN,
    Highlight,
    RANGED_ATTACK_DAMAGE_MAX,
    RANGED_ATTACK_DAMAGE_MIN,
    ClickEnum,
} from "./consts.js";
import {
    getPath,
} from "./geometry.js";
import {
    assert,
    internalError,
} from "./message.js";
import {
    animateEndTurn,
    animateFireballSpell,
    animateInteract,
    animateMeleeAttack,
    animateMove,
    animateRangedAttack,
    animateSpecialAttack,
    animateSwap,
    canDoAction,
    checkFireballSpell,
    checkInteract,
    checkMeleeAttack,
    checkMove,
    checkRangedAttack,
    checkSwap,
    failCheck,
    passCheck,
    updateStateFireballSpell,
    updateStateSpecialAttack,
} from "./resolve_action.js";
import {
    randInt,
} from "./util.js";

///////////////////////////////////////////////////////////////////////////////
// Base Action type

const BaseAction = Object.freeze({
    name:         "BaseAction",
    isActionType: true,

    ////////////////
    // Public API

    // Construction

    // TODO: Get rid of init() and have separately-named constructors based on
    // arg types?
    init: function() {
        this.mustOverride("init");
    },

    isTargeted: function() {
        this.mustOverride("isTargeted");
    },

    // FIXME: There has got to be a better solution than dynamically querying
    // for specific aspects of the constructor's type signature.
    needsPath: function() {
        // Usually this is the right answer.
        return this.isTargeted();
    },

    initNoTarget: function(subject) {
        assert(!this.isTargeted());
        return this.init(subject);
    },

    // Attempt to create an autoAction of this type, with subject targeting
    // target. If successful, return the action; otherwise return null. The
    // action will not be check()ed; the caller should do that.
    tryInitAutoAction(subject, target, theMap) {
        this.overrideIfCalled("tryInitAutoAction");
    },

    // TODO: initWithTarget is handled in figureOutWhatTheUserMeant, based on
    // state.clickType.

    // Executing the action

    check: function(action) {
        this.mustOverride("check");
    },

    doit: function(action, callback) {
        this.checkActionType(action);
        if (!this.check(action).valid) {
            // Callers are supposed to prevent this from happening, so if we
            // get here it indicates a bug in the code. In the interest of both
            // debugging and continuing somewhat gracefully:
            //   - Report an internal error, so we can catch and fix the bug.
            //   - Skip this action, so neither users nor AI can use such a bug
            //     to cheat.
            //   - End the current character's turn, so that if this is an AI
            //     move we don't go into an infinite loop of trying and failing
            //     the same invalid action over and over again.
            internalError("Invalid action.");
            action.subject.actionPoints = 0;
            callback();
            return;
        }
        this.resolve(action);
        action.subject.actionPoints -= this.actionPointCost(action);
        // The anonymous function passed to this.animate() will not be called
        // in the context of this, but must still reference 'this' in order to
        // call this.updateState(). We can't simply close over 'this', because
        // (I guess) it's reset to undefined when the function is called not
        // from the context of any object. We also can't close over just a
        // reference to this.updateState, because then when we call it inside
        // the anonymous function it won't be in the context of this object,
        // meaning that any references to 'this' in updateState will fail.
        // Instead, create a local reference to 'this' under a different name,
        // then close over that.
        let outerThis = this;
        this.animate(action, function() {
            outerThis.updateState(action);
            callback();
        });
    },

    actionPointCost: function(action) {
        this.mustOverride("actionPointCost");
    },

    // Highlighting colors

    getDefaultHighlight: function() {
        this.overrideIfCalled("getDefaultHighlight");
    },

    getHoverHighlightMiddle: function() {
        this.overrideIfCalled("getHoverHighlightMiddle");
    },

    getHoverHighlightEnd: function() {
        this.overrideIfCalled("getHoverHighlightEnd");
    },

    // Other misc

    // TODO [#36]: Rework state.clickType
    getState: function() {
        if (!this.isTargeted()) {
            internalError("getState() of untargeted action");
        } else {
            this.mustOverride("getState");
        }
    },

    // Returns true if every character should always have this action type
    // available, even if it isn't in their availableActions list.
    isAlwaysAvailable: function() {
        return false;
    },

    ////////////////
    // Internal helpers, specific to action type

    // Default resolve is blank, because lots of actions don't need it.
    resolve: function(action) { },

    // Ditto updateState, because in a few cases state update is handled by the
    // animation itself.
    updateState: function(action) { },

    // animate must be overridden. I only know of one case where it
    // intentionally should be empty (EndTurnAction); all other missing
    // animations should be filled in.
    // TODO: Make sure the global state gets reset after animations.
    animate: function(action) {
        this.mustOverride("animate");
    },

    ////////////////
    // Common helpers called by subclasses -- don't override these

    // Helpers used by implementations of real methods

    commonCheck: function(action, checkFunc) {
        this.checkActionType(action);
        if (!canDoAction(action.subject, action.type)) {
            return failCheck("That character can't do that.");
        } else if (action.subject.actionPoints <
                action.type.actionPointCost(action)) {
            return failCheck("Not enough action points.");
        } else {
            return checkFunc(action);
        }
    },

    // Sanity checks

    // Used for methods that every subclass should be overriding.
    mustOverride: function(methodName) {
        internalError(`${this.name} does not override method ${methodName} ` +
            `of BaseAction`);
    },

    // Used for methods that are only called on some subclasses, where those
    // subclasses all need to override it, but others don't because it's never
    // called. This is basically the same as mustOverride, but gives a
    // different error message.
    overrideIfCalled: function(methodName) {
        internalError(`Method ${methodName} called on ${this.name}. Either ` +
            `${this.name} should override it or it should not be called on ` +
            `${this.name}`);
    },

    checkActionType: function(action) {
        if (action.type !== this) {
            internalError(`Method of ${this.name} called on action of type ` +
                `${action.type.name}`);
        }
    },
});

function actionSubclass(subObj) {
    return Object.freeze(Object.assign({}, BaseAction, subObj));
}

///////////////////////////////////////////////////////////////////////////////
// MoveAction

export const MoveAction = actionSubclass({
    name: "MoveAction",

    init: function(subject, path) {
        return {
            type:    this,
            subject: subject,
            path:    path,
        };
    },

    isTargeted: function() {
        return true;
    },

    tryInitAutoAction(subject, target, theMap) {
        let path = getPath(theMap, subject.getPos(), target.getPos());
        if (!path) {
            return null;
        }
        return this.init(subject, path);
    },

    check: function(action) {
        return this.commonCheck(action, checkMove);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 1;
    },

    // State change handled by Crafty's animation

    animate: animateMove,

    getDefaultHighlight: function() {
        return Highlight.CAN_MOVE;
    },

    getHoverHighlightMiddle: function() {
        return Highlight.HOVER_MOVE_MIDDLE;
    },

    getHoverHighlightEnd: function() {
        return Highlight.HOVER_MOVE_END;
    },

    getState: function() {
        return ClickEnum.CHARACTER_MOVE;
    },
});

///////////////////////////////////////////////////////////////////////////////
// SwapPlacesAction

export const SwapPlacesAction = actionSubclass({
    name: "SwapPlacesAction",

    init: function(subject, target, path) {
        return actionWithTarget(this, subject, target);
    },

    isTargeted: function() {
        return true;
    },

    needsPath: function() {
        return false;
    },

    check: function(action) {
        return this.commonCheck(action, checkSwap);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 2;
    },

    // State change handled by Crafty's animation

    animate: animateSwap,

    getState: function() {
        return ClickEnum.CHARACTER_SWAP;
    },
});

///////////////////////////////////////////////////////////////////////////////
// MeleeAttackAction

export const MeleeAttackAction = actionSubclass({
    name: "MeleeAttackAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },

    isTargeted: function() {
        return true;
    },

    // TODO: This is identical in MeleeAttackAction and InteractAction (and
    // almost identical in MoveAction). Factor it out somehow?
    tryInitAutoAction(subject, target, theMap) {
        let path = getPath(theMap, subject.getPos(), target.getPos());
        if (!path) {
            return null;
        }
        return this.init(subject, target, path);
    },

    check: function(action) {
        return this.commonCheck(action, checkMeleeAttack);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 3;
    },

    resolve: function(action) {
        action.damage = randInt(MELEE_ATTACK_DAMAGE_MIN,
            MELEE_ATTACK_DAMAGE_MAX);
    },

    updateState: function(action) {
        this.checkActionType(action);
        // TODO: This should read damage from resolved action.
        action.target.takeDamage(action.damage);
    },

    animate: animateMeleeAttack,

    getDefaultHighlight: function() {
        return Highlight.CAN_ATTACK;
    },

    getHoverHighlightMiddle: function() {
        return Highlight.HOVER_ATTACK_MIDDLE;
    },

    getHoverHighlightEnd: function() {
        return Highlight.HOVER_ATTACK_END;
    },

    getState: function() {
        return ClickEnum.CHARACTER_ATTACK;
    },
});

///////////////////////////////////////////////////////////////////////////////
// RangedAttackAction

export const RangedAttackAction = actionSubclass({
    name: "RangedAttackAction",

    init: function(subject, target) {
        return actionWithTarget(this, subject, target);
    },

    isTargeted: function() {
        return true;
    },

    needsPath: function() {
        return false;
    },

    tryInitAutoAction(subject, target, theMap) {
        return this.init(subject, target);
    },

    check: function(action) {
        return this.commonCheck(action, checkRangedAttack);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 2;
    },

    resolve: function(action) {
        action.damage = randInt(
            RANGED_ATTACK_DAMAGE_MIN,
            RANGED_ATTACK_DAMAGE_MAX,
        );
    },

    updateState: function(action) {
        this.checkActionType(action);
        // TODO: This should read damage from resolved action.
        action.target.takeDamage(action.damage);
    },

    animate: animateRangedAttack,

    getDefaultHighlight: function() {
        return Highlight.CAN_ATTACK;
    },

    getHoverHighlightEnd: function() {
        return Highlight.HOVER_ATTACK_END;
    },

    getState: function() {
        return ClickEnum.CHARACTER_RANGED_ATTACK;
    },
});

///////////////////////////////////////////////////////////////////////////////
// SpecialAttackAction

export const SpecialAttackAction = actionSubclass({
    name: "SpecialAttackAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },

    isTargeted: function() {
        return false;
    },

    check: function(action) {
        return this.commonCheck(action, (_) => { return passCheck(); });
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 4;
    },

    updateState: updateStateSpecialAttack,

    animate: animateSpecialAttack,
});

///////////////////////////////////////////////////////////////////////////////
// FireballSpellAction

export const FireballSpellAction = actionSubclass({
    name: "FireballSpellAction",

    init: function(subject, target) {
        return actionWithTarget(this, subject, target);
    },

    isTargeted: function() {
        return true;
    },

    needsPath: function() {
        return false;
    },

    tryInitAutoAction(subject, target, theMap) {
        return this.init(subject, target);
    },

    check: function(action) {
        return this.commonCheck(action, checkFireballSpell);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return 6;
    },

    updateState: updateStateFireballSpell,

    animate: animateFireballSpell,

    getDefaultHighlight: function() {
        return Highlight.CAN_ATTACK;
    },

    getHoverHighlightEnd: function() {
        return Highlight.HOVER_ATTACK_END;
    },

    getState: function() {
        return ClickEnum.CHARACTER_FIREBALL;
    },
});

///////////////////////////////////////////////////////////////////////////////
// InteractAction

export const InteractAction = actionSubclass({
    name: "InteractAction",

    init: function(subject, target, path) {
        return actionWithPathAndTarget(this, subject, target, path);
    },

    isTargeted: function() {
        return true;
    },

    tryInitAutoAction(subject, target, theMap) {
        let path = getPath(theMap, subject.getPos(), target.getPos());
        if (!path) {
            return null;
        }
        return this.init(subject, target, path);
    },

    check: function(action) {
        return this.commonCheck(action, checkInteract);
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return pathApExclTarget(action.path) + 1;
    },

    updateState: function(action) {
        this.checkActionType(action);
        action.target.interact(action.subject);
    },

    animate: animateInteract,

    getDefaultHighlight: function() {
        return Highlight.CAN_INTERACT;
    },

    getHoverHighlightMiddle: function() {
        return Highlight.HOVER_INTERACT_MIDDLE;
    },

    getHoverHighlightEnd: function() {
        return Highlight.HOVER_INTERACT_END;
    },

    getState: function() {
        return ClickEnum.CHARACTER_INTERACT;
    },
});

///////////////////////////////////////////////////////////////////////////////
// EndTurnAction

export const EndTurnAction = actionSubclass({
    name: "EndTurnAction",

    init: function(subject, target, path) {
        return nullaryAction(this, subject);
    },

    isTargeted: function() {
        return false;
    },

    check: function(action) {
        return this.commonCheck(action, (_) => { return passCheck(); });
    },

    actionPointCost: function(action) {
        this.checkActionType(action);
        return action.subject.actionPoints;
    },

    isAlwaysAvailable: function() {
        return true;
    },

    // No updateState because there's no state change.

    animate: animateEndTurn,
});

///////////////////////////////////////////////////////////////////////////////
// Helpers - factory functions

function actionWithTarget(type, subject, target) {
    return {
        type:    type,
        subject: subject,
        target:  target,
    };
}

// Note: path includes the target. These actions consist of moving to path[-2]
// and then interacting with the target, which is presumably at path[-1].
function actionWithPathAndTarget(type, subject, target, path) {
    return {
        type:    type,
        subject: subject,
        path:    path,
        target:  target,
    };
}

function nullaryAction(type, subject) {
    return {
        type:    type,
        subject: subject,
    };
}

///////////////////////////////////////////////////////////////////////////////
// Helpers - other

function pathApExclTarget(path) {
    // Minus 1 for the start cell, minus 1 for the target cell.
    // TODO: Exclude target from path for MeleeAttackAction and InteractAction,
    // so that everyone can just use action.path.length - 1? (Which matches
    // getPathLength.)
    return path.length - 2;
}

