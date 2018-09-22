Crafty.init(800, 600, document.getElementById('game'));
Crafty.background('#007f3f');

// Component for things that you "can't" pass through.
Crafty.c('Wall', {
    required: '2D, DOM, Color, Solid',
    init: function() {
        this.color('#7f0000');
    }
});

// Draw some rectangles. Woo.
Crafty.e('2D, DOM, Color')
    .attr({x: 0, y: 200, w: 800, h: 200})
    .color('#007f00');
Crafty.e('2D, DOM, Color')
    .attr({x: 300, y: 0, w: 200, h: 600})
    .color('#007f00');

// A thing that you can move around.
Crafty.e('2D, DOM, Color, Fourway, Collision')
    .attr({x: 375, y: 275, w: 50, h: 50})
    .color('#00007f')
    .fourway(200);

// Some obstacles.
// TODO: Actually block movement; currently that doesn't work. :/
Crafty.e('Wall').attr({x: 600, y: 150, w: 50, h: 50});
Crafty.e('Wall').attr({x: 200, y: 200, w: 50, h: 50});
Crafty.e('Wall').attr({x: 550, y: 400, w: 50, h: 50});
