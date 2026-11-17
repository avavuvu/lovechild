// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
//port
//by Marianne Teixido
//https://marianneteixido.github.io/
//
// ported from the original at https://hydra.ojack.xyz/?sketch_id=marianne_0

$o0: osc(0.8, saw.slow(2))
  .kaleid("<3 4 5 7 8 9 10>".slow(10))
  .stretch()
  .mult(solid(0.5, 0.3, 1))
  .colorama(0.4)
  .move(previous($o0).mult(-0.9))
  .scale(0.9)
