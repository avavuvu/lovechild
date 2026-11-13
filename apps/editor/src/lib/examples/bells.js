// Sound pattern based on "Common West African bell v240624" @by Prince Lucija
setcpm(134/4)

$: stack(
  s("bd:3(<4!7 <3 6>>,12)").track("$bd"),
  s("sd:3(<2!3 3>,12,3)").track("$sd"),
  s("hh:3(2,3,1)*4").track("$hh"),
  s("rim(1,3,2)*4").track("$rim"),
  s("perc:2(7,12,3)").degrade().track("$bell"),  // standard african bell pattern
  s("perc:0(3,12,3)").track("$perc")
)
  .bank("BossDR550")
  .lpf(rand.rangex(550,20000).fast(12))
  .lpe(1)
  .end(rand.rangex(0.1,.5))
  .lpq(saw.range(1,9).slow(8))
  .crush(rand.range(4,32))
  .pan(rand)
  .room(saw.range(.01,.4).slow(4))
  .delay(saw.range(.01,.3).slow(4))
  .dt(rand.range(.001,.1).fast(12))
  .dfb(".5")

const square = shape("<4 8>*2").scale(0.3)

$: white().layer(
    noise($hh.hits().add(2), 10)
    .thresh()
    .scale($perc.hits())
    .sub(color("yellow"))
    .when($sd.hits(), x => x.sub(color("indigo")))
    .when($bd.hits(), x => x.invert())
    .blend(black(), $rim.hits().pow(3))
    .when($bell.hits(0.07), x => x.mask(square))
)
