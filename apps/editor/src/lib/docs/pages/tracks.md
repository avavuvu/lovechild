---
category: concept
---

A **track** is a line of code that plays. It can be a sound or an image. All tracks play at once.

In this example, `$drums`, `$osc` and the unnamed `$` are all tracks. `$drums` and `$` are sound tracks, and `$osc` is an image track.

```lovechild
$drums: s("bd*4, hh*8")

$: s("hh*16")

$osc: osc(10).scale($drums.hits())
```

Put an underscore (`_`) in front of a track to mute it.

## Names

To use a track somewhere else, its name must start with `$`. Like in [[Strudel]], any label makes a track, like `drums:` or `osc:`, but only `$` names can be used in code: `drums.hits()` won't work.

## Picking one sound from a stack

When a track is a [[stack()]] of several sounds, `$drums.hits()` reacts to every one of them. There are two ways to pick one.

### [[only()]]

```lovechild
$drums: stack(
  s("bd*4"),
  s("hh*8")
)

$osc: osc(10).scale($drums.only("bd").hits())
```

`$osc` only reacts to the `bd` hits in `$drums`.

### [[track()]]

```lovechild
$: stack(
  s("bd*4").track("$bd"),
  s("hh*8")
)

$osc: osc(10).scale($bd.hits())
```

`$osc` only reacts to the part named `$bd`.
