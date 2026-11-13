# Changes

Discussed changes, most useful first.

## 1. `when` treats silence as false

`.when($crash, x => x.layer(white()))` should apply only while `$crash` is sounding. Today the gaps between events have no value, the selector holds its last value, and the effect stays on after the first event. Fill the gaps in selection conditions with 0, the way `markHits` does, in `packages/strudel/src/selections.ts`. Removes the need for `.hits(0)` in the sound-first idiom.

## 2. Parameters start at their default, not 0

`createValueReader` in `packages/strudel/src/visuals.ts` starts every uniform at 0. `scale("~ 2")` divides by zero for the first half cycle. Start from the definition's default. Also decide what a rest means for a parameter: hold the last value (today) or return to the default.

## 3. Numbers and patterns in image arithmetic

`perlin.add(1)` works, `osc().add(1)` throws "add needs an image". Let `add`, `sub`, `mult`, `blend` and friends accept numbers and patterns by wrapping them in `solid`. The biggest single step towards patterns and images feeling like one language.

## 4. Forward-reference error message

State the rule: names must be defined above where they're used, except inside `previous()`. A lexical scan for `$name:` labels lets the error say "`$q` is defined below. Move it up, or use `previous($q)` to read its last frame" instead of "is not defined".

## 5. Documentation

- `$` means a track: on stage, mutable with `_`, has a last frame. `const` names a recipe.
- Chain order: coordinate steps apply last-first (`repeat().moveX()` vs `moveX().repeat()`). Needs a picture.
- Visual time is tempo time: `setcps` speeds up `noise`, `scroll` and `spin`.
- Multiple `$:` image blocks are combined with `screen`.
- Lines starting with `(`, `[` or a template string begin a new statement.
- Image parameters read the red channel (or red and green for x/y).

## 6. Name collisions with strudel

Image functions replace strudel's global `shape` (distortion), `color` / `colour` (highlight colour) and `noise` (synth noise). Method forms still work. Pick a policy, at least a warning when one is called with a pattern. Same-name methods with different meanings: `.scale`, `.mask`, `.channels`, and `mult` vs strudel's `mul`.

## 7. Float feedback buffers

Buffers are `RGBA8` (`packages/webgl/src/buffer.ts`). Slow fades get stuck below about 25/255, and negative values from `sub` are lost. Use `RGBA16F` with `EXT_color_buffer_float`.

## 8. Per-pixel math

Missing image operations: `div`, `min` / `max`, `pow`, `fract` / `mod`, `abs`, `smoothstep`, and a `polar` coordinate step.

## 9. Hydra arguments for `shape` and `osc`

`shape(sides, radius, smoothing)` and `osc(frequency, speed, offset)`. Ports currently need `.scale()`, `splitX()` and `saw.slow()` workarounds. Alternatively stop presenting the language as Hydra-compatible.

## 10. Seeds

Add a `seed` parameter to `noise` (replacing the fixed `0.5`), and rename `simplex`'s `offset` to `seed`, so one word means one thing next to strudel's `.seed()`.

## 11. `brick(x, y, offset)`

Alternate rows shifted by `offset` tiles. Defaults `3, 3, 0.5`. `brick(4, 4, saw)` animates seamlessly.

## 12. Custom steps

Let users register their own GLSL steps, like Hydra's `setFunction`. The `Definition` format (GLSL, parameters, shapes, signature check) is already close.

## 13. Audio analysis input

An `AnalyserNode` on strudel's output exposed as a pattern, for reacting to what actually sounds (sample amplitude, filter sweeps, external input). `hits()` only covers written patterns.

## 14. Channel used by image parameters

Single-number parameters read `.r`. Luminance would be more intuitive for colourful images. Decide and document.

## 15. `trails(amount)`

`this.blend(previous(), amount)`. The most common feedback idiom in one word.

## 16. Smooth patterned speeds

`scroll`, `spin` and `noise` compute `speed * time`, so changing a patterned speed jumps by `Δspeed * time`. Accumulate position on the CPU per frame instead.

## 17. `fwidth` antialiasing

`shape`'s edge is `0.01` in shape units: aliased when small, blurry when zoomed. `fwidth` keeps it one pixel wide.

## 18. `.cue(sound)`

Attach a sound to an image, gated by the same selection: `every(8, x => x.layer(white()).cue(s("crash")))`. Revisit if visual-first users keep writing timing twice. Needs a pass-through `sound` node, deduplication, and the same first-value rule for `degrade`.

## 19. `at(x, y)`

Evaluate an image at a fixed point, turning it into a whole-frame signal: `camera().at(0.5, 0.5)`. A coordinate step that returns its point.

## 20. Screen capture and mouse

`getDisplayMedia` next to `camera()`, and a `mouse` input.

## 21. `toTexture()` and automatic caching

Render a chain into a texture so it can be sampled many times cheaply. Automatic for neighbourhood steps (`split`, `chromaMove`, future `blur` / `emboss`), explicit `toTexture()` for advanced users. Changes the picture when zoomed in. Not worth it yet.

## Done

- `pixels(count)` / `px`, `resolution()`, `chromaMove(image, amount)`, `scroll` / `scrollX` / `scrollY`, `spin`.
- Shader uniform `resolution` renamed to `areaSize`.
- Muted `_$` recipes in the examples turned into `const`s.
- Editor checkboxes: one before each `true` / `false`, and one in the line-number gutter for each track that mutes or unmutes it.
- `.peek()` on patterns shows the values at that point in the chain as a table below the line: one column per field (names in the property colour), one row per event, newest at the top and older rows fading. Values use their syntax colours (numbers, pattern strings, booleans); rests show as `~` in the gutter colour. Fields that never change show their value once in the top row. Four rows are always reserved and columns only grow, so the box doesn't jump around. A pattern that never changes shows one row. `peak` renamed to `peek` (old name still works).
- Muting a track turns it off everywhere: a muted `$name` is `silence` (pattern) or an empty image wherever it's referenced, so `.hits()`, `previous($name)` and derived tracks stop too. A silent driver is a `const`. Reading a muted track's previous frames renders black instead of raising "only reads previous frames".
