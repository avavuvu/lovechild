// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// Perpetual elevator buttons
// By Khoparzi
// http://khoparzi.com
//
// ported from the original at https://hydra.ojack.xyz/?sketch_id=khoparzi_1

let drift = saw.slow(6)

let rainbow = rgb(
  osc(0.16, drift.sub(0.16)),
  osc(0.16, drift),
  osc(0.16, drift.add(0.16))
)

let $o1 = shape(3)
  .scale(0.3)
  .add(rainbow)
  .add(previous($o1).mult(
    sine2
      .slow(12.5)
      .mul(0.7)
      .add(0.1)
  ))
  .scale(sine2.slow(50))
  .spin(-0.03)
  .min(1)
  .max(0)

$: $o1.spin(0.03)
