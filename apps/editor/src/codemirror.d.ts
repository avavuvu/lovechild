declare module '@strudel/codemirror/flash.mjs' {
    import type { Extension } from '@codemirror/state'
    import type { EditorView } from '@codemirror/view'

    export const flashField: Extension
    export const flash: (view: EditorView) => void
}

declare module '@strudel/codemirror/highlight.mjs' {
    import type { Extension } from '@codemirror/state'
    import type { EditorView } from '@codemirror/view'
    import type { Hap } from '@strudel/core'

    export const highlightExtension: Extension
    export const updateMiniLocations: (view: EditorView, locations: ReadonlyArray<[number, number]>) => void
    export const highlightMiniLocations: (view: EditorView, time: number, haps: ReadonlyArray<Hap>) => void
}

declare module '@strudel/codemirror/widget.mjs' {
    import type { Widget } from '@strudel/transpiler'

    export class BlockWidget {
        constructor(widget: Widget)
        toDOM(): HTMLElement | undefined
    }

    export const setWidget: (id: string, element: HTMLElement) => void
}
