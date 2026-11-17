---
category: concept
---

**Arrow functions** are part of JavaScript, and are useful to know for creating more advanced sketches or reducing the amount of code you need to write.

```lovechild
let arrowFunction = (size /* the inputs */) => /* the output */ {}
```

It's especially good when you have multiple similar yet distinct elements.
In this example, without the arrow function, you would need to repeat all of `noise(4).thresh(0.4, 0.1).scrollX(/* speed */)` for the three elements, just to change the speed. Instead, you can simply define a function that can take in the thing you want changed, and giving you back it with everything else the same.

```lovechild
let makeSomeNoise = (speed) => noise(4).thresh(0.4, 0.1).scrollX(speed)

$: makeSomeNoise(0.9)
  .min(makeSomeNoise(0.3))
  .min(makeSomeNoise(0.09))
```

Arrow functions also appear in [[pattern]] code. Here, `x` represents the oscillator [[image]] when a condition has been met, in this case, the hats being triggered. You can't use `.layer()` without an image to call it on, so `x` stands in for that image. `x` is just a convention popularised in [[Strudel]], it can be named anything.

```lovechild
$hats: s("hh - hh -")

$: osc(3)
  .scrollX(1)
  .when($hats.hits(), x => x.layer(text('hello world')))
```
