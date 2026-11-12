$kick: s("tr808_bd*4")

$saw: n("<[2 -] [0 -] [3 -] [0 -]>/2")
  .s("supersaw")
  .scale("C2:major")
  .every(8, x => x.dist(4).postgain(0.1))

const square = shape(4).scale("<0.2 0.3>*2")
  .scaleX($kick.hits(0.1).mul(8))
  .rotate($saw.hits(.5))

const warp = previous()
  .chromaMove(previous().scale(1.01), 1)
  .layer(
      osc(0.64, saw.slow(1.6))
        .splitX(0.5)
        .mask(square))

$: white()
    .layer(
        warp
          .saturate("<1.2 0.02>/4")
    )
  .every(8, x => x.layer(white()))
