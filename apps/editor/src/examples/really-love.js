// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// Really Love
// by Abhinay Khoparzi
// http://khoparzi.com
// ported from the Hydra original at https://hydra.ojack.xyz

const triangle = shape(3)
  .scale(0.3)
  .scale(cosine.slow(12.57).range(-2, 2))
  .rotate(isaw.slow(12.57))

$: osc(15.92, isaw.slow(2.52))
  .splitX(0.01)
  .pixelateX(50)
  .pixelateY(20)
  .kaleid(sine.slow(25.1).range(-6, 12))
  .rotate(saw.slow(25.1))
  .rotate(triangle.range(0, 0.159))
  .diff(previous().brightness(0.3))
