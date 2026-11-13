---
category: sound
parameters:
  - name: sound
    types: [string, Pattern]
---

**`only()`** keeps the events of one sound and drops the rest. Use it to pick one voice out of a [[tracks|track]] made with `stack`.

```lovechild
$drums: stack(
  s("bd*4"),
  s("sd*2"),
  s("hh*8")
)

$: shape(4).scale($drums.only("sd").hits(0.5))
```

Write `name:number` to tell apart sounds that share a name: `only("perc:2")` keeps `perc:2` but not `perc:0`. Without a number both are kept.
