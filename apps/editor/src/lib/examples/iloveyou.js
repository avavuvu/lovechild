const emoji = chooseCycles(true, false)
  .peek()

const t = text(emoji.pick([
  "i love you",
  seq('👁️', '❤️', '🫵')
])).scale(0.2)

const warp = previous()
  .chromaMove(previous().scale(1.01), 1)
  .layer(
      osc(0.64, saw.slow(1.6))
        .splitX(0.5)
        .mask(t))

$: white()
    .layer(
        warp
          .scale(1.009)
          .rotate(0.0002)
    )
    .when(emoji, x => x.layer(t))
