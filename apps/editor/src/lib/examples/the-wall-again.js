// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// after "the-wall" by Alexandre Rangel
// www.alexandrerangel.art.br/hydra.html

let stripes = (count, phase) => osc(count, phase).thresh("<0.3 0.7>/2")

let $bricks = stripes(4, saw)

$: stripes(8, isaw.fast(1.5))
  .color("<blue purple>")
  .add($bricks.rotate(1 / 8).color('red').scale(stripes(10, isaw.slow(5)).add(1)))
  .diff($bricks.rotate(1 / 4).color('yellow').scale(stripes(10, isaw.slow(3)).add(1)))
  .rotate(stripes(9, isaw.slow(12)).mult(1 / 6))
  .scale(stripes(7, isaw.slow(4)).add(1))
  .scale(2)
