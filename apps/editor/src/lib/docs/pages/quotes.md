---
category:
    - concept
    - text
aliases:
    - single quotes
    - double quotes
    - backtick
    - quotation marks
---

In regular JavaScript, single quotes (`'`) and double quotes (`"`), are identical in meaning: defining a string of text. However, in Lovechild, single quotes are for a literal string, whereas double quotes gets automatically converted in a [[pattern]] that uses [[mini notation]].

Some functions, such as [[samples()]] will not work if you try using double quotes, as the [[transpiler]] will assume you are trying to define a pattern.

The backtick ( `` ` ``) is also converted into a pattern, and has the added benefit of being able to spread across multiple lines.

```lovechild
setcpm(140/4)

$: s(`
    [hh hh hh hh],
    [-  ht -  [- mt]],
    [-  sd -  sd],
    [bd -  [- bd]  - ]
`)
  .bank("tr808")
  .dec(0.2)
```

<Wikipedia page="Quotation marks"/>
