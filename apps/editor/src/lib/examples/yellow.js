const feedback = previous($out).moveX(saw.range("<-1 2>","<1 -1>").slow("<4 8>/4"));

$kick: s("[bd*2] -")

const q = osc(10)
    .mult(shape(4).scaleX(3))
    .diff(feedback.scaleX(1.09))
    .thresh()
    .add(previous($out))

$out: q.sub(q.moveX($kick.hits(0.7).range(1,1.2)))
    .scaleY(saw.range($kick.hits(0.2), 1))
    .sub(solid(0.2, 0.2, 1))
    .when($kick.hits(0.1), x => x.invert())
