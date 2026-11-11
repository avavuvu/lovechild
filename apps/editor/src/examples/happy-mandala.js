// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// Happy Mandala
// By Abhinay Khoparzi
// twitter/github/instagram: @khoparzi
// ported from the Hydra original at https://hydra.ojack.xyz

_$mandala: voronoi(5, -1 / 32, 5)
  .add(osc(0.159).splitX(1))
  .move(0.5)
  .kaleid(21)
  .colorama()

$: $mandala
  .mult(
    camera()
      .rotate($mandala.range(0, 15.9))
      .range(1.5, 1))
