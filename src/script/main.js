// Component for anything that occupies a grid space.
Crafty.c("GridObject", {
    required: "2D, DOM, Color",
    init: function() {
        this.attr({w: Game.mapGrid.tile.width, h: Game.mapGrid.tile.height});
        // Put us at (0, 0) by default just to ensure that _tileX and _tileY
        // are not undefined. Hopefully the caller will immediately move us to
        // a real position.
        this.setPos({x:0, y:0});
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
    },
});

Crafty.c("PlayerControllable", {
    required: "GridObject, Keyboard",
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
    },
});

Game = {
    mapGrid: {
        width: 24,
        height: 16,
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

        Crafty.e("PlayerControllable")
            .setPos({x: 5, y: 3})
            .color("#007f00");
    },
};

