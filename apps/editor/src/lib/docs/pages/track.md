---
category: sound
parameters:
  - name: name
    types: [string]
---

**track()** names part of a [[tracks|track]] so you can use it somewhere else. 

```lovechild
$: stack(
  s("bd:3(<4!7 <3 6>>,12)").track("$bd"),
  s("sd:3(<2!3 3>,12,3)").track("$sd"),
  s("hh").track("$hh"),
  s("rim(1,3,2)*4").track("$rim"),
  s("perc:2(7,12,3)").degrade().track("$bell"),  // standard african bell pattern
  s("perc:0(3,12,3)").track("$perc")
)
  .bank("BossDR550")

$: white().layer(
    osc($hh.hits().add(2), 10)
    .thresh()
    .scale($perc.hits())
)
```

To just pick a sound to trigger on without naming anything, use [[only()]].
