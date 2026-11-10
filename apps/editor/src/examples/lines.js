
setcpm(172/4)

$bd: s("bd - [- bd] -")
  .bank("tr808")
  .dist(4)

$sd: s("<- cp>*4")
  .bank("tr808")
  .dec(0.02)
  .dist(4)

$hh: s("hh*8")
  .bank("tr808")
  .almostNever(x => x.ply(4))
  .dec(0.02)
  .dist(4)

$: shape(4)
  .scale(0.2)
  .scaleX(
      $sd.hits(0.03).range(1, 19))
  .sub(osc(4))
  .scaleY($bd.hits(0.03).pow(3).range(1,9))
  .degrade()

$: shape(4)
  .scaleX(0.3)
  .repeatX()
  .moveX(0.4)
  .scaleY(
    $bd.hits(2).pow(3).range(1, 19))
  .scaleX($hh.hits(0.020).range(0,.1))
  .sub(osc(24))
  .rotate(sine)
  .preview()
  .sometimes(x => x.thresh().colorama(3))
