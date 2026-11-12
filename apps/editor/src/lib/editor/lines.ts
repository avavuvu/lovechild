import { StateEffect, StateField, type EditorState, type Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import type { Location } from '@lovechild/strudel'

export interface LineMessage {
    location: Location
    text: string
}

class MessageWidget extends WidgetType {
    readonly texts: ReadonlyArray<string>
    readonly className: string

    constructor(texts: ReadonlyArray<string>, className: string) {
        super()
        this.texts = texts
        this.className = className
    }

    eq(other: MessageWidget) {
        return other.className === this.className && other.texts.join('\n') === this.texts.join('\n')
    }

    toDOM() {
        const element = document.createElement('div')
        element.className = this.className

        for (const text of this.texts) {
            const line = document.createElement('div')
            line.textContent = text
            element.append(line)
        }

        return element
    }
}

const groupByLine = (state: EditorState, messages: ReadonlyArray<LineMessage>) => {
    const lines = new Map<number, Set<string>>()

    for (const { location, text } of messages) {
        if (location.start <= state.doc.length) {
            const start = state.doc.lineAt(location.start).from
            lines.set(start, (lines.get(start) ?? new Set()).add(text))
        }
    }

    return lines
}

const createLineMarks = (kind: 'warning' | 'error') => {
    const mark = Decoration.line({ class: `cm-${kind}-line` })
    const setMessages = StateEffect.define<ReadonlyArray<LineMessage>>()

    const createMarks = (state: EditorState, messages: ReadonlyArray<LineMessage>) => {
        const marks: Array<Range<Decoration>> = []

        for (const [start, texts] of groupByLine(state, messages)) {
            const widget = new MessageWidget(Array.from(texts), `cm-line-message cm-${kind}-message`)
            marks.push(mark.range(start), Decoration.widget({ widget, block: true, side: 1 }).range(state.doc.lineAt(start).to))
        }

        return Decoration.set(marks, true)
    }

    const field = StateField.define<DecorationSet>({
        create: () => Decoration.none,
        update: (marks, transaction) => {
            const effect = transaction.effects.find((candidate) => candidate.is(setMessages))
            return effect ? createMarks(transaction.state, effect.value) : marks.map(transaction.changes)
        },
    })

    return { setMessages, extension: [field, EditorView.decorations.from(field)] }
}

export const warningLines = createLineMarks('warning')

export const errorLines = createLineMarks('error')
