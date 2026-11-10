const feedback = previous().moveX(saw.slow("<4 8>/4"))

const q = osc(10)
  .mult(shape(4).scaleX(3))
  .diff(feedback.scaleX(1.09), 0.4)
  .add(solid(0.2,0.2,1))

$: q.sub(osc("<4 8>*4"))
