---
category: 
    - color
    - combine
---

**`min()`** takes two images and returns the *minimum* of the two. For each pixel, it compares the `red`, `green`, `blue` and `alpha` (transparency) values separately, and keeps the smaller value for each one. This means the result can mix the two: it might take its red from the first image and its green from the second, giving a colour that neither image had. It's counterpart is [[max()]].

```lovechild
$: noise(0.9)
  .color("yellow")
  .min(color("lightgreen")
```

Below is an example of the max comparison for one pixel in an image.

|  | first | second | min |
|---|---|---|---|
| r | 0.9 | 0.3 | **0.3** |
| g | 0.2 | 0.7 | **0.2** |
| b | 0.5 | 0.5 | **0.5** |
| a | 1.0 | 0.4 | **0,4** |
