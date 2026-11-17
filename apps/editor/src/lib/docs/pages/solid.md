---
category:
    - source
    - color
---

**solid()** generates an [[image]] where every pixel is set to the provided RGB color. 

Most commonly, this function will be called by providing three numbers from 0 to 1, representing the amount red, green, and blue in the color. When only one number is provided, it will instead create a grayscale image with brightness set to that number.

It can also take a HTML color name.

```lovechild
$: osc(3).screen(solid("<firebrick wheat>"))
```
