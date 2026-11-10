# TypeScript conventions

- Do not write comments.
- Do not write tests.
- Do not test your code unless you have a good reason to.
- Always use braces for `if`, `else` and loops, even around a single statement.
- No semicolons, including in interface and type members. Single-line type literals use commas: `{ cols: number, rows: number }`.
- Never start a line with `(`, `[` or a template literal. Restructure instead, e.g. use `for (const pass of [first, second]) { … }` rather than `;[first, second].forEach(releasePass)`.
- Use `Array<T>` and `ReadonlyArray<T>`, never `T[]`.
- Use arrow functions for top-level functions, callbacks and object members. Class methods are fine. Use `function` only for a function that needs its own `this`, a generator, or overload signatures. Never rely on hoisting: define helpers before the code that uses them.
- Function names start with a verb: `renderFrame`, `getCellSize`, `createAtlas`, `setUniform`, `isSceneLoaded`.
- Booleans (variables, parameters, class properties, getters, type properties) start with `is`, `has`, `should`, `can`, `was` or `did`. Exempt: object literals passed to external APIs (`{ once: true }`), DOM properties (`hidden`, `muted`), destructured fields, and external JSON data.
- Use full words, never abbreviations: `event`, `element`, `error`, `context`, `transaction`, `button`, `callback`, `index`, `message`, `response`, `request`, `value`, `temporary`, `string`, `object`, `array`. Allowed short names: `x`, `y`, `id`, `url`, `href`, `src`, `gl`, and `a` / `b` in sort comparators.

## Example

```ts
interface Pass { id: string, isEnabled: boolean }

export const releasePasses = (passes: ReadonlyArray<Pass>, shouldClear: boolean) => {
    for (const pass of passes) {
        if (!pass.isEnabled) {
            continue
        }

        releasePass(pass)
    }

    if (shouldClear) {
        clearPasses()
    }
}
```
