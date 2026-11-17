// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// "the-wall"
// Alexandre Rangel
// www.alexandrerangel.art.br/hydra.html
//
// ported from the hydra original at https://hydra.ojack.xyz/?sketch_id=alexandre_0
setcpm(0.5)

const bars = (frequency, phase) => osc(frequency, phase).thresh(0.4)

const stripes = bars(4.46, saw.fast(0.89))

$: bars(7.64, isaw.fast(1.53))
  .color('blue')
  .add(
    stripes
      .rotate(0.125)
      .color('red')
      .scale(bars(10.19, isaw.fast(0.2)).add(1))
  )
  .diff(
    stripes
      .rotate(0.25)
      .color('magenta')
      .scale(bars(10.19, isaw.fast(0.31)).add(1))
  )
  .rotate(bars(8.59, isaw.fast(0.086)).mult(0.159))
  .scale(bars(7, isaw.fast(0.28)).add(1))
  .colorama(
    sine
      .range(9.878, 9.902)
      .slow(85)
  )
  .scale(2.122)
  .stretch()
