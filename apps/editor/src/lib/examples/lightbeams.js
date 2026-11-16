const drift = saw.slow("<4 8>/4")

$: previous($out).moveX(drift)
  .screen(
    osc(10)
      .rotate(0.25)
      .mult(shape(4).scaleX(3))
      .diff(previous($out).moveX(drift).scaleX(1.09))
      .add(solid(0.2, 0.2, 1))
      .layer(text(cat('♥', '★').fast(8)).fill('white'))
      .sub(osc("<4 8>*4"))
      .track("$out"))
