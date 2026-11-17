let bg = (seed) => solid(1, 0.2, 0.9).diff(
  simplex(
    1,
    1,
    time
      .mul(0.1)
      .add(seed)
  )
    .thresh()
    .sub(solid(0, 0, 1))
).luma(0.01)

let t = text("♥ ⚧").fill(bg(0.2))

$: bg(10).layer(t)
