import { WidgetType } from '@codemirror/view'
import type { PatternPreview } from '@lovechild/strudel'
import type { Pattern } from '@strudel/core'
import { mount, unmount } from 'svelte'
import PatternTable from './PatternTable.svelte'

export interface PatternSource {
    readonly patterns: ReadonlyMap<string, Pattern>
    readonly time: number
}

export const createPatternPreviews = () => {
    let patterns: ReadonlyMap<string, Pattern> = $state.raw(new Map())
    let time = $state(0)

    const source: PatternSource = {
        get patterns() {
            return patterns
        },
        get time() {
            return time
        },
    }

    return {
        source,
        show: (previews: ReadonlyArray<PatternPreview>) => {
            patterns = new Map(previews.map(({ id, pattern }) => [id, pattern]))
        },
        setTime: (next: number) => {
            time = next
        },
    }
}

const components = new WeakMap<HTMLElement, ReturnType<typeof mount>>()

export class PatternPreviewWidget extends WidgetType {
    readonly id: string
    readonly source: PatternSource

    constructor(id: string, source: PatternSource) {
        super()
        this.id = id
        this.source = source
    }

    eq(other: PatternPreviewWidget) {
        return other.id === this.id
    }

    toDOM() {
        const element = document.createElement('div')
        components.set(element, mount(PatternTable, { target: element, props: { id: this.id, source: this.source } }))
        return element
    }

    destroy(element: HTMLElement) {
        const component = components.get(element)

        if (component) {
            unmount(component)
            components.delete(element)
        }
    }

    ignoreEvent() {
        return true
    }
}
