// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// Puertas III
// por Celeste Betancur
// https://github.com/essteban
//
// ported from the original at https://hydra.ojack.xyz/?sketch_id=celeste_1

$o0: osc(6.4, saw.fast(2.5))
  .splitX(0.025)
  .scale(
    osc(6.4)
      .splitX(0.025)
      .kaleid(8)
      .add(1)
  )
  .repeat(2, 4)
  .move(previous($o0).mult(-0.05))
  .kaleidMove(shape(4, 10).scale(0.1), 4)
  .stretch()
