setcpm(130/4)

_$feedback: previous($out).moveX(saw.slow("<4 8>/4"))

_$q: osc(10)
  .mult(shape(4).scaleX(3))
  .diff($feedback.scaleX(1.09))
  .thresh()
  .add(previous($out))

$out: $q.sub($q.moveX(sine)).scaleY(saw.range("<0.24 0.3 0.9>/2", 1))
  .sub(solid(0.2,0.2,1))
