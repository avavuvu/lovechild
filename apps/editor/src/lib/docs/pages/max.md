---
category: 
    - color
    - combine
---

**`max()`** takes two images and returns the *maximum* of the two. For each pixel, it compares the `red`, `green`, `blue` and `alpha` (transparency) values separately, and keeps the larger value for each one. This means the result can mix the two: it might take its red from the first image and its green from the second, giving a colour that neither image had. It's counterpart is [[min()]].

```lovechild
$: noise(0.9)
  .color("aqua")
  .max(color("darkblue"))
```

Below is an example of the max comparison for one pixel in an image.

|  | first | second | max |
|---|---|---|---|
| r | 0.9 | 0.3 | **0.9** |
| g | 0.2 | 0.7 | **0.7** |
| b | 0.5 | 0.5 | **0.5** |
| a | 1.0 | 0.4 | **1.0** |
