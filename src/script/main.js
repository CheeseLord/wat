Crafty.init(800, 600, document.getElementById('game'));
Crafty.background('#007f3f');

// Draw some rectangles. Woo.
Crafty.e('2D, DOM, Color')
    .attr({x: 0, y: 200, w: 800, h: 200})
    .color('#007f00');
Crafty.e('2D, DOM, Color')
    .attr({x: 300, y: 0, w: 200, h: 600})
    .color('#007f00');

// A thing that you can move around.
Crafty.e('2D, DOM, Color, Fourway')
    .attr({x: 375, y: 275, w: 50, h: 50})
    .color('#7f0000')
    .fourway(200);
