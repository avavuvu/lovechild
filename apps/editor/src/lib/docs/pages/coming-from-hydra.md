---
title: coming from hydra
category: concept
---

While **[[Hydra]]** was the inspiration for Lovechild, there are many small differences between the two. This article will go through some of the most important.

## Outputs, sources, and feedback
The biggest difference between Hydra and Lovechild is the way sources are defined. Hydra defines the output buffers `o0`, `o1`, `o2`, `o3` for you, and to display one on the screen you call `render(o1)`.

```hydra
osc().out()
```

For Lovechild, everything placed after a dollar sign label will be output to a screen. This means that outputs can have any name, as long as it starts with `$`.

```lovechild
$: osc().rotate(0.1)
// both work the same
$myOscillator: osc().rotate(0.1)
```


### Feedback
While this is similar so far, this means creating feedback loops needs to be done differently. Making a shape move based on feedbacking color could be done like this in Hydra:

```hydra
solid(1, 1, 1).layer(
  src(o0)
    .modulateHue(src(o0).scale(1.01), 1)
    .layer(
      osc(4, 0.5, 2)
        .mask(shape(4, 0.4))
    )
).out(o0)
```

Here, `o0` is read by `src(o0)` on line 2 and line 3. Then, the changes are fed back into `o0` with `.out(o0)`. To do something similar with Lovechild, you can use the [[previous()]] function, which will read the last frame of the current block.

```lovechild
$: solid(1, 1, 1).layer(previous()
  .chromaMove(previous().scale(1.01), 1)
  .layer(
    osc(0.64, saw.slow(1.6))
      .splitX(0.5)
      .mask(shape(4).scale(0.4))
  )
)
```

This creates an issue, what if you wanted to zoom into the final output by 2×? Just adding `.scale(2)` almost works, but because it's feedbacking on the final output, it's taking the zoom into account.

To do this, you can move the feedbacking area to its own labelled area.

```lovechild
let $warp = solid(1, 1, 1).layer(previous($warp)
  .chromaMove(previous($warp).scale(1.01), 1)
  .layer(
    osc(0.64, saw.slow(1.6))
      .splitX(0.5)
      .mask(shape(4).scale(0.4))
  )
)

$: $warp.scale(2)
```

For those familiar with JavaScript (or most programming languages), this might look weird. You are declaring `$warp` at the same time you are using `$warp`! If you tried this in normal JavaScript, it wouldn't work, but because we are wrapping it in `previous()`, we are not accessing `$warp`, we are accessing the *previous* frame of `$warp`, which we know must exist.

## Arrays
To make values change in Hydra, you define them in an array. That functionality has been replaced by [[Strudel]]'s [[patterns]]. Patterns are defined by [[mini notation]], which is a deep topic in itself, but in its simplest form, works just like arrays except defined by [[double quotes]] (`"`).

```hydra
osc([3, 4, 5].fast(0.5).out()
```

```lovechild
$: osc("3 4 5".fast(0.5))
```


## No modulate
There is no `modulate()` method, in fact, there is no `modulateRotate()`, `modulateScale()` or anything of the sort. To achieve the same things with Lovechild, you can just use the respective plain functions, [[move()]], [[rotate()]], and [[scale()]].

```lovechild
$: osc(6.4).move(osc(1.6).mult(-0.1))
```

This is because those functions can take either a number *or* an image. At each pixel, the image is moved by the amount of the other image at its pixel.

While `modulate()` has been removed, there are corresponding functions for Hydra's `modulateHue()` and `modulateKaleid()`. They have been renamed [[chromaMove()]] and [[kaleidMove()]] respectively.

## Number of arguments
Many of the methods in Hydra take two or three arguments, which might only have one or two with Lovechild. For example Hydra's `osc()` function asks for the number of oscillations, a scroll speed, and an RGB shift.

```hydra
osc(40, 0.1, 1).out()
```

The same effect is replicated with Lovechild by chaining methods.

```lovechild
$: osc(6.4, saw.fast(1.3)).splitX(0.025)
```

## Signals
To make a value change over time in Hydra, you use an [[arrow function]] that plugs into the `time` value.

```hydra
osc(40, 0).colorama(() => Math.sin(time) * 0.1).out()
```

With Lovechild, use the in-built [[sine]] signal instead. It is important to note that Hydra's sine wave goes from -1 to 1, whereas the default `sine` with Lovechild goes from 0 to 1. To replicate Hydra, use [[sine2]].

```lovechild
$: osc(6.4).colorama(sine2.mul(0.1).slow(3.14))
```

## Angles
In Hydra, angles are defined in radians. A radian is defined based on Pi (π), so that `2 * π` is equal to one full rotation.

```hydra
osc(40).rotate(3.14 / 2).out()
```

With Lovechild, angles are defined by turns, so a quarter rotation is equal to 1/4, or 0.25; a half rotation is 1/2, or 0.5; and so on.

```lovechild
$: osc(6.4).rotate(0.25)
```

## Stretch
In Hydra, coordinates are based on the screen's width and height. A four sided shape defined with `shape(4)` will look rectangular on a rectangular display. With Lovechild a `shape(4)` will look like a square.

```hydra
shape(4).out()
```

To bring back Hydra's defaults, use the [[stretch()|.stretch()]] method.

```lovechild
$: shape(4).stretch()
```
