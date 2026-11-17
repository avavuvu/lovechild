const emoji = chooseCycles(false, true)

const t = text(emoji.pick([
  "i love you",
  "👁️ ❤️ 🫵"
]))
  .scale(0.2)
  .when(inv(emoji), x => x.lag(0.9))

let $warp = previous($warp)
  .chromaMove(previous($warp).scale(1.01), 1)
  .saturate(1.09)
  .layer(
    osc(0.64, saw.slow(1.6))
      .splitX(0.5)
      .mask(t)
  )
  .scale(1.009)
  .rotate(0.0002)

$: white()
  .layer($warp)
  .when(emoji, x => x.layer(t).saturate(0).min(color(0.5)))
