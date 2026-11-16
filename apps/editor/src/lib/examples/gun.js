setcpm(28)

$shutter: s("white*16")
  .degradeBy(0.4)
  .lpf(150)
  .lpq(15)
  .lpenv(6)
  .lpd(0.03)
  .lpa(0)

$: s("pink")
  .lpf(cosine.range(250, 2200))
  .gain(0.12)

$: note("<d2 d2 a1 c2>")
  .s("sine")
  .decay(0.6)
  .sustain(0)
  .room(0.5)

const gun = shape(4)
  .scale(4, 0.02)
  .moveX(-2)
  .rotate(saw.add(sine2))
  .max(shape(4).scale(0.03))

$: previous()
  .sub(0.006)
  .max(
    gun
      .stutter($shutter)
      .colorama()
      .chromaMove(previous())
  )
  .mult(color('white'))
  .add(
    gun
      .lag(0.25)
      .mult(color('red'))
      .mult(0.5)
  )
  .layer(
    //   | click me!
    //   V
    text(false ? 'gun' : '🔫')
      .move(0.6, -0.2)
      .scale(0.2)
      .rotate(saw.add(sine2))
      .stutter($shutter)
  )
