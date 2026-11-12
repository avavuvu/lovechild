$feedback: previous($q).moveX(saw.slow("<4 8>/4"))

_$q: osc(10)
  .mult(shape(4).scaleX(3))
  .diff($feedback.scaleX(1.09))
  .add(solid(0.2,0.2,1))
  .layer(text(cat('♥', '★').fast(8)).fill('white'))

$out: $q.sub(osc("<4 8>*4"))
