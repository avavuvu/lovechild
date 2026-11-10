# Requirements: Strudel-style Hydra

A live coding language for visuals, derived from Hydra, designed to run side by side with Strudel in a single editor.

---

## 1. Goals

- **Readable for audiences.** Code projected at a live coding event should be followable by audience members, not just the performer.
- **In sync with Strudel.** Sound and visuals share one clock, one pattern engine and one mental model.
- **Functional.** Immutable values, self-contained transformations, and no behaviour that depends on hidden context.
- **Transparent.** No opaque positional signatures and no hidden side effects, even where that means breaking from Hydra.

### Non-goals

- Backwards compatibility with Hydra sketches.
- 3D rendering.

---

## 2. Language design

### 2.1 Core principles

- **Every function is a self-contained transformation** that means the same thing wherever it appears in a chain.
- **Each step transforms everything above it** (reading order), the same rule Strudel uses.
- **Each function does only what its name says.** Hidden side effects are removed or made into explicit steps.
- **One function per transformation.** How something changes over time comes from the pattern or signal passed to it, not from separate "moving" versions of functions.

### 2.2 Two kinds of value

| Kind | Examples | Evaluated | Lives on |
|---|---|---|---|
| Patterns and signals | `"<3 4 6>"`, `sine.range(0, 1)`, `0.5` | Once per frame | CPU, passed to shaders as uniforms |
| Images | `osc(10)`, `camera()`, `cam.r()` | Per pixel | GPU |

- An image is a *description* of how to work out a colour at any point, not a rendered buffer. A whole chain compiles to a single fragment shader.
- **Any parameter accepts a number, a pattern or signal, or an image.** An image parameter varies per pixel, e.g. `rotate(cam.r())` rotates each pixel by the camera's red channel. This replaces Hydra's `modulate*` family.
  - An image passed where a number is expected gives its luminance.
  - It's read at the coordinate the step receives, so steps above it transform the parameter image too.
  - `.range(min, max)` maps an image's 0–1 values to a new range, as Strudel's `.range` does for signals: `scale(cam.r().range(1, 1.5))`. `.between` is an alias.

### 2.3 Syntax rules

- **No curly brackets**: no options objects.
- **Arrow functions are allowed for transformations**, as in Strudel: `.every(4, x => x.kaleid(6))`, `.sometimes(x => x.invert())`.
- **Arrow functions are not used for computing values over time.** Signals replace Hydra's `() => Math.sin(time)` style.
- **No setter methods.** A method never modifies the stage before it. Extra parameters become standalone functions where possible.
- **A second positional argument is allowed only** when a parameter genuinely can't be separated out and its meaning is obvious from the function name.
- **Examples spell out values** rather than relying on defaults (`shape(3)`, not `shape()`).
- **Parameters are one number per pixel**, and an image parameter is read as its brightness. Two steps read more than one channel when given a single image: `.move(image)` uses red and green as an (x, y) offset, and `.shift(image)` uses red, green and blue. `.move(x, y)` also takes two numbers; `.move(0.2)` moves both axes.
- **Every parameter has a default**, so `.thresh()` is `.thresh(0.5)`. Defaults are Hydra's, converted where our units differ: `osc()` is 10 stripes (Hydra's 60 radians), `rotate()` is an eighth of a turn (Hydra's 10 radians). `range`/`between` default to 0–1 and `channels` to `"rgba"`, so neither changes the image. `add`, `sub`, `mult`, `diff`, `layer`, `mask` and `screen` take no amount argument.

### 2.4 Decomposing Hydra's compound functions

Many of Hydra's extra parameters are general transformations in disguise:

| Hydra | New | Notes |
|---|---|---|
| `osc(4, 0.25, 1)` | `osc(0.64, saw.slow(3.14)).splitX(0.25)` | Frequency is in stripes, so Hydra's 4 radians is 0.64; speed becomes a phase that moves one stripe per loop, so it's seamless at any frequency; colour offset becomes a general channel split of offset ÷ frequency |
| `shape(4, 0.5)` | `shape(4).scale(0.5)` | Radius becomes scale |
| `scale(1, 0.5, 0.05)` | `.scaleX(0.5).scaleY(0.05)` | The stretch amounts become their own steps |
| `rotate(1, 1)` | `.rotate(saw.add(0.15))` | Continuous rotation via `saw` |
| `() => Math.sin(time/5) * 0.5` | `sine.range(-0.5, 0.5).slow(16)` | |
| `[3, 2, 1]` | `"<3 2 1>"` | Mini-notation replaces arrays |
| `[0, 1].fast(0.25)` | `"<0 1>".slow(4)` | |
| `modulateRotate(tex, n)` | `rotate(tex.r())` | Image as parameter |
| `pixelate(20, 10)` | `.pixelateX(20).pixelateY(10)` | Like `scale`/`scaleX`/`scaleY`; centred, cells per unit |
| `repeat(3, 2)` | `.repeatX(3).repeatY(2)` | Centred; the row offsets aren't ported yet |
| `scroll(0.1, 0, 0.5)` | `.repeat(1).moveX(saw.slow(2).add(0.1))` | Speed becomes a signal; Hydra's hidden wrap becomes an explicit `.repeat(1)` |
| `modulate(tex, 0.1)` | `.move(tex.xy().range(0, -0.1))` | Image as parameter; given one image, `move` reads red as x and green as y |
| `modulateScale(tex, -0.03)` | `.scale(tex.range(1, 0.97))` | |
| `posterize(3, 0.6)` | `.posterize(3)` | Gamma fixed at Hydra's 0.6 |
| `thresh(0.5, 0.04)`, `luma(0.5, 0.1)` | `.thresh(0.5)`, `.luma(0.5)` | Tolerance fixed at Hydra's defaults |
| `color(1, 0.5, 0)` | `.mult(solid(1, 0.5, 0))` | |
| `noise(10, 0.1)` | `noise(10, saw.slow(8))` or `noise(10, 0, time.mul(0.2))` | Speed becomes a phase that loops, or an offset that never repeats; output is 0–1 rather than Hydra's −1–1, so `.range(-1, 1)` gives Hydra's |
| `add(tex, 0.8)`, `mult(tex, 0.8)` | `.add(tex.range(0, 0.8))`, `.mult(tex.range(0.2, 1))` | Amounts become a `range` on the other image |
| `shape(4, 0.3)` in a stretched frame | `shape(4).scale(0.3)` | Hydra stretches to the screen, so sketches often squash shapes to compensate; ours keeps the aspect, so those corrections are dropped |
| `voronoi(5, 0.3, 0.3)` | `voronoi(5, saw.slow(4), 0.3)` | Speed becomes a looping phase; blending stays a third argument because it can't be separated from the cell distance |
| `gradient(1)` | `gradient().add(solid(0, 0, sine))` | Plain red/green ramp; the moving blue becomes an explicit step |

Decompositions are not always pixel-identical (e.g. scaling a shape also scales its edge softness). That is acceptable.

### 2.5 Units

- **Time is measured in cycles, not seconds**, so visuals follow Strudel's tempo.
- **Rotation is measured in turns, not radians.** `rotate(0.5)` is upside down.
- **Units are chosen so common motions loop seamlessly.** `rotate(saw)` turns once per cycle with no visible jump; `osc(4, saw)` moves one stripe per cycle. `moveX` and `moveY` don't wrap, so slow oscillators have no seam; `.repeat(1).moveX(saw)` wraps an image at the edges.
- **Strudel's `time` signal is the ever-increasing one**, counted in cycles. Rotation and oscillator phase loop anyway, so they take `saw`; noise takes `time` as a third argument to drift without repeating: `noise(6, 0, time.mul(0.1))`.

### 2.6 Chain semantics

- **Reading order**: each step transforms the image produced by everything above it.
- **Placement matters and is consistent**: `.rotate()` after `.mult(osc(4))` rotates both; `osc(4).rotate()` inside the argument rotates only the stripes.
- **Chains are immutable**: every method returns a new value, so `const` pieces can be reused safely.
- **Hidden side effects are removed**: `kaleid` re-centres its output. Effects that previously happened implicitly become explicit steps, e.g. `.kaleid(5).moveX(0.2).kaleid(12)`.
- Free-function forms for combinators (`mult(a, b)`, `blend(a, b)`) should be considered, as Strudel offers both forms.

### 2.7 Definitions, labels and outputs

- **Labelled lines are what's running.** Labels keep Strudel's meaning.
- **`$name:` labels are also names**, so a running line can be referred to without rewriting it as a `const`:

  ```js
  $drums: s("bd ~ bd sd")
  _$lines: osc(10)

  $: $lines.kaleid(4).scale($drums.hits(0.2).range(1, 1.5))
  ```

  - Only labels starting with `$` are names, so they never shadow Strudel functions.
  - A muted line (`_$lines:`) stays off the speakers or screen but can still be referred to.
  - A name must be defined above where it's used.
- **`const` still works** for things that are never run on their own.
- **`$:` is used for both sound and visuals.** The runtime tells them apart by what the chain starts with (`s(...)` vs `shape(...)`).
- **Multiple visual `$:` blocks layer together** with screen blending, mirroring how multiple Strudel blocks play together.
- **`_$:` mutes a block**, as in Strudel.
- **No `o0`–`o3` outputs.** Buffers are allocated by the runtime.
- **Feedback** uses named functions: `.trails(0.9)` or `.mix(previous(), 0.9)`.
  - **`previous()` is the last frame of the whole block it's in**, as Hydra's `o0` is, so every step in the block is fed back: `$: stripes.blend(previous(), 0.94).scale(0.8)`.
  - For a loop around only part of a patch, put that part in its own named block: `_$trail: camera().blend(previous(), 0.9)`, then `$: $trail.kaleid(4)`.
  - A `const` holding `previous()` belongs to whichever block uses it.
  - **`previous($name)` is another block's last frame**, so two blocks can feed each other as Hydra's `o0` and `o1` can. Because it's only the last frame, the block may be defined further down; using a name's current frame still needs it defined above.
  - `previous()` tiles when read outside the frame, as Hydra's does, so scaling feedback down fills the screen instead of going black.
- **No `s0`–`s3` sources or initialisation step.** Named inputs instead: `camera()`, `video("file.mp4")`, `image("file.png")`.
  - Inputs keep their aspect ratio: their shorter side spans 0–1, the same rule as the screen. Outside the input is transparent black.
  - Paths with `/` and URLs need single quotes, because double-quoted strings are mini-notation.
  - An input that's no longer used is released, so the camera turns off.
- **Reused `const`s are always inlined**, so they look exactly as if written out. Within a pass, a reused `const` read at the same position is computed once.

### 2.8 Colour channels

- **Swizzle methods** on images, named as in GLSL but called with brackets like every other step: `cam.rrr()`, `cam.bgr()`, `cam.r()`.
  - Implemented as methods generated on the image prototype (340 combinations of `rgba`, one to four letters).
  - Compiles directly to a GLSL swizzle, so there's no runtime cost.
- **`.channels("bgr")`** as the patternable equivalent, e.g. `.channels("<rgb bgr gbr>")`.
- **`.split(amount)`** draws red `amount` one way and blue the other, with green in place. `splitX` and `splitY` work along one axis; `split` along both. Amount is in screen units like `moveX`, but nothing wraps: each channel just samples further out.
- **`xyzw` letters work too**, as in GLSL: `.xy()` is exactly `.rg()`. They read better when an image is used as a position or offset.
- **What swizzles produce:** one letter gives a grey image (`.r()` is r, r, r). Two letters fill red and green, with blue 0. One to three letters set alpha to 1; four letters set all four channels.

### 2.9 Naming

- Names describe what the audience sees.
- Avoid names that already mean something in Strudel (`speed`, `size`, `shape`), or deliberately make shared names mean analogous things.
- **`scale` keeps Hydra's name.** It's a method on images only, so Strudel's `.scale("C:minor")` on sounds is unaffected.
- Optional shorthands may be added only as plain aliases of existing functions (e.g. `spin(n)` is exactly `rotate(saw.slow(n))`).
- **`polygon` is an alias of `shape`.** Our `shape` hides Strudel's standalone `shape()` function; the `.shape()` method on sounds is unaffected.
- **`noise` hides Strudel's standalone `noise()` control**, as `shape` does; the `.noise()` method on sounds is unaffected. It's smooth simplex noise, not white noise.

---

## 3. Strudel integration

- **Use Strudel's pattern engine directly**, not a reimplementation, so mini-notation, signals, `.slow()`, `.range()` and so on mean exactly the same thing in sound and visuals.
- **Every parameter accepts patterns**, removing the need for Strudel's `H()` wrapper.
- **Higher-order functions work on images**: `every`, `sometimes`, `when` and similar, so the same tools vary sound and visuals in step.
  - Strudel's own functions decide *when*: each runs on a marker pattern with one event per cycle, so the choice is made per cycle (or per part of a cycle, for `chunk`), with the same randomness as sound.
  - Both variants compile into one shader, switched by a uniform. Only the chosen branch runs, and switching never recompiles.
  - Functions that layer a pattern over itself (`superimpose`, `off`) are not selections, so they aren't included.
- **`.hush()` and `.degrade()` work on images**, as in Strudel:
  - `.hush()` gives an empty, transparent image, so a hushed block shows nothing.
  - `.degradeBy(amount)` hides the whole image at random, once per cycle, with the same randomness as sound; the amount can be a pattern. `.degrade()` is `.degradeBy(0.5)`.
- **Visuals can react to events**, not just the clock:

  ```js
  const drums = s("bd ~ bd sd")

  $: drums
  $: shape(4).scale(drums.hits(0.2).range(1, 1.5))
  ```

- **Event-to-value conversions**: `.hits(length)` falls from 1 to 0 over `length` cycles after each event (default 0.2; `.hits(0)` is 1 during each event and 0 between; the length can be a pattern, `.hits("<0.1 0.5>")`), and `.glide(length)` slides from one value to the next, both in cycles. Holding needs no function, because rests already keep the last value.
- **Curves are separate steps** that reshape any 0–1 value, such as fades and signals: `drums.hits(0.2).pow(3)`, `sine.smooth()`.
- **Audio lookahead is accounted for**, so visuals are queried at the time sound is heard, not when it was scheduled.
- **Mini-notation highlighting** works for visual patterns as well as sound.

---

## 4. Architecture

### 4.1 Taken from Hydra

- **The GLSL function library** (`glsl-functions.js`) as the starting point for shader code, edited for re-centring, turns, and decomposed parameters.
- Hydra's rendering approach (full-screen quad, ping-pong framebuffers for feedback, camera/video/image textures) as a reference. The rendering layer itself is small enough to rewrite.
- hydra-ts is a useful reference for running Hydra without globals.

### 4.2 Taken from Strudel

| Package | Use |
|---|---|
| `@strudel/core` | Patterns, signals, scheduler |
| `@strudel/mini` | Mini-notation |
| `@strudel/transpiler` | `$:` labels, mini-notation locations for highlighting |
| `@strudel/codemirror` | Editor and highlighting |
| `@strudel/webaudio`, superdough | Sound |
| `@strudel/draw` | Reference for audio lookahead and visual timing |
| `@strudel/hydra` | Reference only; replaced by this project |

`<strudel-editor>` is **not** used, because the project needs control over evaluation and scope.

### 4.3 New work

- **Chain and compiler layer.** Immutable chains, parameters that compile to either a uniform or a per-pixel expression, swizzle methods, pattern parameters queried each frame.
- **Intermediate representation.** The compiler emits a small tree of operations, and GLSL is generated from that, so a WGSL backend can be added later.
- **Runtime.** Whole-program analysis for layering `$:` blocks, buffer allocation for feedback and reused `const`s, and routing labelled blocks to sound or visuals.
- **Higher-order functions on images.** Changing shader *structure* over time (see open questions).
- **Event-driven helpers** (`.hits`, `.glide`, etc.).
- **Editor assembly.** Code over a full-screen canvas.

### 4.4 Rendering

- **WebGL 2 is the initial target**, for reliability across the varied hardware used at gigs (WebGPU support on Linux and in Firefox is still incomplete as of late 2026).
- Do not depend on regl; use a thin WebGL 2 layer or a light library such as twgl.
- **WebGPU is a later backend**, enabled by the intermediate representation, mainly for compute-based features (particles, simulations, GPU audio analysis).
- three.js's TSL (compiles to both GLSL and WGSL) is worth evaluating, at least as a reference.

### 4.5 Repository structure

A TypeScript monorepo using pnpm workspaces and Vite, following the conventions in `conventions.md`.

```
packages/
  core/      # chains, intermediate representation, GLSL generation
  webgl/     # renderer and runtime: buffers, feedback, camera/video/image sources
  strudel/   # glue: pattern parameters, $: routing, hits/glide, audio lookahead
apps/
  editor/    # Svelte app: CodeMirror, canvas, evaluation
```

- **Dependencies flow one way**: `core` ← `webgl` ← `strudel` ← `editor`.
- **`core` has no DOM and no Strudel dependency.** It takes a chain and produces a shader description. Parameters are defined as a number, an image, or something that gives a number for a given frame; the `strudel` package adapts patterns to fit.
- **The language is embeddable** in other editors (Strudel's REPL, Flok, others) without the Svelte app.
- **Svelte is used only for the editor's interface** (panels, settings, error display). Evaluation and runtime logic live in plain TypeScript in the packages. CodeMirror 6 is used through a thin wrapper.
- **Start with these four packages** and split further only when needed.
- **Keep tooling minimal**: no Turborepo, Nx or Changesets until builds are slow or packages are published.

---

## 5. Build order

1. New chain and compiler, with plain numbers only
2. Pattern and signal parameters via `@strudel/core`
3. Editor plus `$:` routing, so sound and visuals run together
4. Feedback, layering and automatic buffers
5. Images as parameters (replacing `modulate*`)
6. Higher-order functions and event-driven helpers
7. Optional WebGPU backend

---

## 6. Licensing

Strudel's packages are AGPL-3.0-or-later and hydra-synth is AGPL, so this project is AGPL. Source must be published for any hosted version, including modified ones.

The sketches in `apps/editor/src/examples/` with a CC licence line are ports of Hydra's examples and stay under their own licence, CC BY-NC-SA 4.0, with the original credits in each file. They are not AGPL and can't be used commercially.

---

## 7. Open questions

- **Project name.**
- **Routing `$:` blocks:** confirm whether Strudel's transpiler turns `$: x` into `x.p('$')`. If so, a `.p()` method on images may route visual blocks without forking the transpiler.
- **Scene switching:** whether to support deliberately routing and cutting between separate scenes, beyond muting with `_$:`.

---

## Appendix: example

**Hydra:**

```js
// flower
shape().scale(1.5,[0.25,0.5,0.75,1].fast(0.25),[3,2,1])
  .invert([0,1].fast(0.25))
  .kaleid(5)
  .kaleid(12)
  .scale( ()=>Math.sin(time/5)*0.5 )
  .rotate(1,1)
  .out(o0)
```

**New** (values to be tuned to match the original look):

```js
// flower
$: shape(3)
  .scale(1.5)
  .scaleX("<0.25 0.5 0.75 1>".slow(4))
  .scaleY("<3 2 1>")
  .invert("<0 1>".slow(4))
  .kaleid(5)
  .moveX(0.2)
  .kaleid(12)
  .scale(sine.range(-0.5, 0.5).slow(16))
  .rotate(saw.slow(4).add(0.15))
```
