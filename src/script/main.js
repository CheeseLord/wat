// Component for anything that occupies a grid space.
Crafty.c("GridObject", {
    required: "2D, DOM, Color, Tween",
    init: function() {
        this.attr({w: Game.mapGrid.tile.width, h: Game.mapGrid.tile.height});
        // Put us at (0, 0) by default just to ensure that _tileX and _tileY
        // are not undefined. Hopefully the caller will immediately move us to
        // a real position.
        this.setPos({x: 0, y: 0});
    },

    // Get and set the position in map-grid tiles (not pixels).
    getPos: function() {
        return {x:this._tileX, y:this._tileY};
    },
    setPos: function(newPos) {
        // newPos is {x: newX, y: newY}
        this.attr({
            _tileX: newPos.x,
            _tileY: newPos.y,
            x:      newPos.x * Game.mapGrid.tile.width,
            y:      newPos.y * Game.mapGrid.tile.height,
        });
        // So that "setter" attributes can be chained together.
        return this;
    },
    moveBy: function(deltaPos) {
        // deltaPos is {x: deltaX, y: deltaY}
        var oldPos = this.getPos();
        this.setPos({
            x: oldPos.x + deltaPos.x,
            y: oldPos.y + deltaPos.y,
        });
        return this;
    },
    // TODO: Don't duplicate so much code between this and setPos.
    animateTo: function(newPos) {
        // newPos is {x: newX, y: newY}
        this.attr({
            _tileX: newPos.x,
            _tileY: newPos.y,
        });
        this.tween({
            x:      newPos.x * Game.mapGrid.tile.width,
            y:      newPos.y * Game.mapGrid.tile.height,
        }, 200);
        // So that "setter" attributes can be chained together.
        return this;
    },
});

Crafty.c("PlayerControllable", {
    required: "GridObject, Keyboard, Mouse",
    init: function() {
        this.bind('KeyDown', function(e) {
            if (e.key == Crafty.keys.LEFT_ARROW) {
                this.moveBy({x: -1, y:  0});
            } else if (e.key == Crafty.keys.RIGHT_ARROW) {
                this.moveBy({x:  1, y:  0});
            } else if (e.key == Crafty.keys.UP_ARROW) {
                this.moveBy({x:  0, y: -1});
            } else if (e.key == Crafty.keys.DOWN_ARROW) {
                this.moveBy({x:  0, y:  1});
            }
        });
        this._isHighlighted = false;
    },

    highlight: function() {
        this._isHighlighted = true;
        return this.color("#00bf00");
    },
    unhighlight: function() {
        // TODO HACK: What color were we originally?
        this._isHighlighted = false;
        return this.color("#007f00");
    },
    isHighlighted: function() {
        return this._isHighlighted;
    }
});

Game = {
    mapGrid: {
        width: 25,
        height: 17,
        tile: {
            width: 16,
            height: 16,
        },
    },

    width: function() {
        return this.mapGrid.width * this.mapGrid.tile.width;
    },

    height: function() {
        return this.mapGrid.height * this.mapGrid.tile.height;
    },

    start: function() {
        Crafty.init(Game.width(), Game.height(),
            document.getElementById("game"));
        Crafty.background("#ccc");

        // Random static objects
        Crafty.e("GridObject").color("#7f0000").setPos({x: 17, y:  9});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 11, y:  3});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 19, y: 11});
        Crafty.e("GridObject").color("#7f0000").setPos({x:  8, y: 11});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 11, y: 12});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 14, y:  9});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 21, y:  5});
        Crafty.e("GridObject").color("#7f0000").setPos({x: 17, y: 13});
        Crafty.e("GridObject").color("#7f0000").setPos({x:  2, y: 13});
        Crafty.e("GridObject").color("#7f0000").setPos({x:  2, y:  9});

        var player = Crafty.e("PlayerControllable")
            .setPos({x: 5, y: 3})
            .color("#007f00");

        // Temporary hack to log wherever you click.
        // Also moving player to clicked tile
        // Basically copied from:
        //     http://craftyjs.com/api/MouseSystem.html
        Crafty.s("Mouse").bind("Click", function(e) {
            if (e.target == player &&
                    e.mouseButton == Crafty.mouseButtons.LEFT) {
                player.highlight();
                Crafty.log("You clicked on the player.");
            } else {
                let x = Math.floor(e.realX / Game.mapGrid.tile.width);
                let y = Math.floor(e.realY / Game.mapGrid.tile.height);
                Crafty.log(`You clicked at: (${x}, ${y})`);
                if (player.isHighlighted()) {
                    player.animateTo({x:x, y:y});
                    player.one("TweenEnd", function() {
                        player.unhighlight();
                    });
                }
            }
        });

        // Animate centering the viewport over the player, taking 1500ms to do
        // it. Then, once the animation is done, set the viewport to follow the
        // player (with offset (0, 0)).
        Crafty.viewport.clampToEntities = false;
        Crafty.one("CameraAnimationDone", function() {
            Crafty.viewport.follow(player, 0, 0);
        });
        Crafty.viewport.centerOn(player, 1500);
    },
};

