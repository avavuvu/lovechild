import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { bracketMatching } from '@codemirror/language'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { crosshairCursor, Decoration, drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap, lineNumbers, rectangularSelection, WidgetType, type DecorationSet } from '@codemirror/view'
import type { EvaluationResult } from '@lovechild/strudel'
import { flash, flashField } from '@strudel/codemirror/flash.mjs'
import { highlightExtension, highlightMiniLocations, updateMiniLocations } from '@strudel/codemirror/highlight.mjs'
import { BlockWidget, setWidget } from '@strudel/codemirror/widget.mjs'
import type { Hap } from '@strudel/core'
import type { Widget } from '@strudel/transpiler'
import { blockMarkers } from './blocks'
import { bracketColors } from './brackets'
import { theme } from './theme'

export interface EditorOptions {
    parent: HTMLElement
    onEvaluate: (code: string) => void
    onStop: () => void
}

export interface Editor {
    evaluate: () => void
    setCode: (code: string) => void
    showEvaluation: (result: EvaluationResult) => void
    highlight: (time: number, haps: ReadonlyArray<Hap>) => void
    destroy: () => void
}

class InlineWidget extends WidgetType {
    readonly widget: Widget
    readonly block: BlockWidget

    constructor(widget: Widget) {
        super()
        this.widget = widget
        this.block = new BlockWidget(widget)
    }

    eq(other: InlineWidget) {
        return other.widget.type === this.widget.type && other.widget.index === this.widget.index
    }

    toDOM() {
        return this.block.toDOM() ?? document.createElement('div')
    }

    ignoreEvent() {
        return true
    }
}

const setWidgets = StateEffect.define<ReadonlyArray<Widget>>()

const createDecorations = (state: EditorState, widgets: ReadonlyArray<Widget>) => {
    const decorations = widgets.map((widget) => {
        const line = state.doc.lineAt(Math.min(widget.to, state.doc.length))
        return Decoration.widget({ widget: new InlineWidget(widget), side: 1, block: true }).range(line.to)
    })

    return Decoration.set(decorations, true)
}

const widgetField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, transaction) => {
        const effect = transaction.effects.find((candidate) => candidate.is(setWidgets))

        if (effect?.is(setWidgets)) {
            return createDecorations(transaction.state, effect.value)
        }

        return decorations.map(transaction.changes)
    },
    provide: (field) => EditorView.decorations.from(field),
})

export const createEditor = ({ parent, onEvaluate, onStop }: EditorOptions): Editor => {
    const evaluate = (view: EditorView) => {
        flash(view)
        onEvaluate(view.state.doc.toString())
    }

    const handleKeydown = (event: KeyboardEvent, view: EditorView) => {
        if (!event.altKey) {
            return false
        }

        if (event.code === 'Enter') {
            event.preventDefault()
            evaluate(view)
            return true
        }

        if (event.code === 'Period') {
            event.preventDefault()
            onStop()
            return true
        }

        return false
    }

    const view = new EditorView({
        parent,
        state: EditorState.create({
            extensions: [
                lineNumbers(),
                highlightSpecialChars(),
                history(),
                drawSelection({ cursorBlinkRate: 0 }),
                dropCursor(),
                rectangularSelection(),
                crosshairCursor(),
                closeBrackets(),
                javascript(),
                javascriptLanguage.data.of({ closeBrackets: { brackets: ['(', '[', '{', "'", '"', '<'] } }),
                EditorView.domEventHandlers({ keydown: handleKeydown }),
                keymap.of([
                    indentWithTab,
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...historyKeymap,
                ]),
                highlightExtension,
                flashField,
                widgetField,
                blockMarkers,
                bracketColors,
                bracketMatching(),
                theme,
            ],
        }),
    })

    return {
        evaluate: () => evaluate(view),
        setCode: (code) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }),
        showEvaluation: ({ miniLocations, widgets, previews }) => {
            for (const { id, element } of previews) {
                setWidget(id, element)
            }

            updateMiniLocations(view, miniLocations)
            view.dispatch({ effects: setWidgets.of(widgets) })
        },
        highlight: (time, haps) => highlightMiniLocations(view, time, haps),
        destroy: () => view.destroy(),
    }
}
