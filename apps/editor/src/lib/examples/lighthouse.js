setcpm(20)

$horn: note("<a1 ~ e1 ~ ~>")
  .s("sawtooth")
  .lpf(200)
  .attack(0.8)
  .release(4)
  .room(0.9)
  .gain(0.5)

const lake = voronoi(30, 0.05)
  .diff(noise(7.1, 0.02))
  .grey()
  .posterize(5)
  .mult(solid(0.7, 0.8, 1))

const beam = shape(4)
  .scaleX(0.05)
  .scaleY(3)
  .spin(0.05)

$: lake
  .blend(lake.posteriseTime(fps(2), 0.5), 0.5)
  .brightness(-0.2)
  .layer(
    lake
      .brightness(0.3)
      .mask(beam.lag(0.4))
  )
  .add(beam.mult(0.2))
  .add(shape(32).scale(0.02))
