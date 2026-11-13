 const cam = osc(13)
  .sub(
    previous()
      .scale(1.00001)
      .rotate(0.02)
  )

$: cam.screen(cam.scroll(.1))
