---
title: arrow functions
aliases:
    - arrow function
    
category: concept
---

**Arrow functions** are part of JavaScript, and are useful to know for creating more advanced sketches or reducing the amount of code you need to write.

```lovechild
let arrowFunction = (/* the inputs */) => /* the output */ {}
```

It's especially good when you have multiple similar yet distinct elements.
In the example below, without the arrow function, you would need to repeat all of `noise(4).thresh(0.4, 0.1).scrollX(/* speed */)` three times, just to change the speed. Instead, you can simply define a function with everything the same, except for the one parameter you want to change. In the below example, it is called `speed`, but it can be named anything.

```lovechild
let makeSomeNoise = (speed) => noise(4).thresh(0.4, 0.1).scrollX(speed)

$: makeSomeNoise(0.9)
  .min(makeSomeNoise(0.3))
  .min(makeSomeNoise(0.09))
```

## In patterns
```lovechild
$hats: s("hh - hh -")

$: osc(3)
  .scrollX(1)
  .when($hats.hits(), x => x.layer(text('hello world')))
```

Arrow functions also appear in [[pattern]] code. Here, `x` represents the oscillator [[image]] [[when]] a `hh` is being played. You can't use `.layer()`, or any image method, without an image to call it on, so `x` stands in for that image. `x` is just a convention popularised in [[Strudel]], it can be named anything.

## Non-arrow-functions
You can also define a function with the older non-arrow-function, by using the `function` keyword. While there are some differences between the two, for Lovechild, the difference doesn't matter. You could write the above code with it as—while cumbersome—it will still work.
```lovechild
$hats: s("hh - hh -")

$: osc(3)
  .scrollX(1)
  .when($hats.hits(), function(x) { return x.layer(text('hello world')) })
```
