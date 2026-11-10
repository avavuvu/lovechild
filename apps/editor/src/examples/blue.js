const cam = camera()
  .b()
  .sub(
    previous().rg().scale(1.02).rotate(0.02))

$: cam.screen(cam.moveX(1))
