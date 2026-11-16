# Ideas

What in lovechild would make embedding it in a host (like ascii-love) easier, roughly from most practical to most blue-sky. Each item says what the host had to build or work around.

## Embedding (headless as a real product)

1. **A published headless bundle with its own types.** ascii-love had to alias source files from the checkout and dedupe the Strudel packages and `acorn` in Vite, and write a hand-made types file. A built `@lovechild/headless` package with exported types would make it a one-line install.
2. **A renderer that draws into a GL context the host already has.** Something like `createRenderer({ gl, target })`, which handles text, pictures, video and feedback. ascii-love rewrote the WebGL renderer as its own runner and imported the private `text.ts`. The `resolution` → `areaSize` rename broke that copy with no error.
3. **A versioned graph format.** Built-in uniforms (`areaSize`, `time`, `origin`, …) would be declared in the graph, not left to convention. Hosts could then check compatibility instead of rendering black.
4. **A host hook for media paths.** Something like `resolveMedia(source)`, so `picture("x.png")` resolves relative to the host's content folder.

## Inputs and time

5. **Compile reports which names are free.** The transpiler's tree already knows which `$names` are used but never defined. ascii-love finds inputs with a regex over the code.
6. **Inputs created on demand.** Any free `$name` would become an input automatically, with no `defineInput` up front.
7. **Continuous inputs.** Something like `defineSignal("synthLevel", () => number)`, read when queried. For `$synthLevel`, ascii-love pushes a tiny event every frame and relies on the last value holding.
8. **A clock object in headless.** It would cover cps changes, speed, a mapping from external time (scene time vs music time), and nudges. ascii-love tracks the cycle itself so that changing speed doesn't jump; that's changes.md #16 from the host side.
9. **A faster event store for inputs.** Right now each query scans the whole 8-cycle history.
10. **A seed option on `createVisuals`.** This would make every random thing repeatable for offline renders.

## Live editing

11. **`visual.update(code)`.** It would recompile while keeping feedback buffers, matched by track name rather than buffer index, plus input history and the clock. ascii-love hands over buffers by index, so a reordered track gets another track's trails.
12. **Resizing that keeps the picture.** Copy the old buffer into the new one instead of starting from black.
13. **Warnings about muted tracks.** "`$q` is muted, so it is empty where `$out` uses it." That one silently blacked out a demo.
14. **Structured errors with code locations,** like the warnings. Hosts could then show where the code broke, not just a message.

## Sound and music

15. **Audio analysis as patterns.** `analyse("kicks.ogg").onsets()`, `.level()`, `.bands(4)`, `.centroid()`, worked out ahead of time and repeatable. ascii-love has a hit detector for this, but it belongs inside the language, where `$kicks.hits()` already lives.
16. **Live analysis** (changes.md #13): an `AnalyserNode` on Strudel's output or on the mic, as patterns.
17. **Stems as first-class sound.** `stem("synth.ogg").bars(49, 64).loop()`, playing in sync with the cycle, with bar numbers as in FL. Most of ascii-love's music source is "Strudel samples with `loopAt`, snapping to bar lines".
18. **Button-driven sections as patterns.** `section("<intro rain storm>", $press.count(10))`, which changes on the next 4-bar line. The snap/hold logic would be written once, in the language, and the visuals would share it.
19. **Offline audio rendering.** Superdough through an `OfflineAudioContext`, so Strudel-made sound could go into a video export.
20. **Bundled sample packs.** The default sample packs come from GitHub and a CDN; an offline set would work in a kiosk with no internet.

## Composition

21. **Several outputs.** `compiled.outputs` would give each named track as its own texture, so a host can treat `$bg` and `$text` as separate layers, like ascii-love's per-source glyph sets.
22. **Host knobs.** `knob("hue", 0.5, 0, 1)` in the code would appear as `compiled.knobs` for a host GUI or cue sheet, declared by the code.
23. **Scenes and transitions in the language.** `scene("pulse", …)` and `a.dissolve(b, progress)`, with a press-driven state machine (`$press.count() > 8`). A whole artwork's sequence could be a lovechild program.
24. **The cue timeline as a pattern.** `cue("<intro rain storm>/16")` instead of a separate cue format.
25. **An `.ascii(glyphs)` step.** ascii-love's glyph mapping as a lovechild image step, or a luminance-grid export, so the editor previews the final look.

## Tooling

26. **A frame-render function.** `renderFrames(code, { fps, duration })` returning frames plus an audio mixdown, for tests and exports with no host.
27. **Seeking.** Patterns are pure functions of time, so scrubbing works except for feedback; it could warm feedback up by running N frames before the seek point.
28. **Image values back as patterns.** `$out.mean()` or `.at(x, y)`, so the picture can drive sound: the reactivity running the other way.
29. **A host protocol for the editor.** It would send code over a websocket to a running host like ascii-love, so you write in the lovechild editor and watch the installation update live. That would make the editor the authoring tool for a whole artwork.
30. **Snapshot tests for graphs.** Compile examples and diff the GLSL, so renames like `areaSize` show up in review instead of in a host.

## Performance

31. **Skip held captures entirely.** A held `posteriseTime`, `stutter` or `capture(0)` still reads and writes a full-resolution `RGBA16F` buffer every frame, because all buffers share one ping-pong write index. Give each buffer its own write index, work out gates that are the same for every pixel on the CPU (onsets already are, ticks would move from GLSL to JS with `fps()` and `seconds()` resolved, and the shader would read the result as a uniform), and skip the pass and the swap while closed. Per-pixel gates like `posteriseTime(noise())` keep today's path. A Firefox profile of a four-capture scene spent a median 8 ms per frame waiting on the GPU.

**5, 7, 11 and 15** would remove most of the glue code ascii-love has today. **17 + 18** would move its music system into lovechild itself.
