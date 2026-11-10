// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
//Glitch River
//Flor de Fuego
//https://flordefuego.github.io/
// ported from the Hydra original at https://hydra.ojack.xyz

const cells = voronoi(8, saw.slow(31.4))

$: cells
  .mult(
    osc(1.59, saw.slow(31.4))
      .splitX(sine.slow(31.4).range(-0.3, 0.3))
      .saturate(3)
      .moveX(0.5)
      .kaleid(200))
  .move(previous().xy().range(0, -0.5))
  .add(previous().range(0, 0.8))
  .moveY("<-0.01 0.01>")
  .scale(0.99)
  .moveX(cells.range(0, -0.008))
  .moveY(cells.range(0, -0.008))
  .luma(0.3)

$: s("ace_perc")
