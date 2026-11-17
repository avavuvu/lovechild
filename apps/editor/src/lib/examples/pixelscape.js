// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
//Pixelscape
//Marianne Teixido
//https://github.com/MarianneTeixido
//
// ported from original ay https://hydra.ojack.xyz/?sketch_id=marianne_1

let $noise = noise(1, 0.2)
  .mult(2)
  .sub(1)
  .rotate(0.32)
  .crisp()
  .spin(0.08)
  .layer(
    previous($o0)
      .crisp()
      .moveX(-0.2)
  )

$o0: previous($o0)
  .crisp()
  .saturate(1.01)
  .scale(0.999)
  .mult(1.01)
  .hue(0.01)
  .chromaMove(
    previous($noise)
      .crisp()
      .hue(0.3)
      .posterize(-1)
      .contrast(0.7),
    2
  )
  .layer(
    previous($noise)
      .crisp()
      .luma()
      .mult(gradient().saturate(0.9))
  )
