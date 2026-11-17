import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { bracketMatching } from '@codemirror/language'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { crosshairCursor, Decoration, drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap, lineNumbers, rectangularSelection, ViewPlugin, WidgetType, type DecorationSet } from '@codemirror/view'
import type { EvaluationResult } from '@lovechild/strudel'
import { getWidgetID, previewNames } from '@lovechild/strudel/editor'
import { flash, flashField } from '@strudel/codemirror/flash.mjs'
import { highlightExtension, highlightMiniLocations, updateMiniLocations } from '@strudel/codemirror/highlight.mjs'
import { sliderPlugin, updateSliderWidgets } from '@strudel/codemirror/slider.mjs'
import { BlockWidget, setWidget } from '@strudel/codemirror/widget.mjs'
import type { Hap } from '@strudel/core'
import type { Widget } from '@strudel/transpiler'
import { blockMarkers } from './blocks'
import { bracketColors } from './brackets'
import { formatView } from './format'
import { createPatternPreviews, PatternPreviewWidget } from './pattern-previews.svelte'
import { createKeyHandler } from './keys'
import { errorLines, warningLines, type LineMessage } from './lines'
import { theme } from './theme'
import { createToggles } from './toggles'
import { tokenColors } from './tokens'

export interface EditorOptions {
    parent: HTMLElement
    onEvaluate: (code: string) => void
    onStop: () => void
    shouldFormat?: () => boolean
}

export interface Editor {
    evaluate: () => void
    setCode: (code: string) => void
    showEvaluation: (result: EvaluationResult) => void
    highlight: (time: number, haps: ReadonlyArray<Hap>) => void
    showWarnings: (messages: ReadonlyArray<LineMessage>) => void
    showErrors: (messages: ReadonlyArray<LineMessage>) => void
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

interface PlacedWidget {
    to: number
    widget: WidgetType
}

const setWidgets = StateEffect.define<ReadonlyArray<PlacedWidget>>()

const createDecorations = (state: EditorState, placed: ReadonlyArray<PlacedWidget>) => {
    const decorations = placed.map(({ to, widget }) => {
        const line = state.doc.lineAt(Math.min(to, state.doc.length))
        return Decoration.widget({ widget, side: 1, block: true }).range(line.to)
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

const remeasureOnResize = ViewPlugin.define((view) => {
    const observer = new ResizeObserver(() => view.requestMeasure())
    observer.observe(view.contentDOM)
    return { destroy: () => observer.disconnect() }
})

export const createEditor = ({ parent, onEvaluate, onStop, shouldFormat = () => false }: EditorOptions): Editor => {
    const evaluate = (view: EditorView) => {
        if (shouldFormat()) {
            formatView(view)
        }

        flash(view)
        onEvaluate(view.state.doc.toString())
    }

    const patternPreviews = createPatternPreviews()

    const placeWidget = (widget: Widget): PlacedWidget => {
        const id = getWidgetID(widget)
        const isPattern = patternPreviews.source.patterns.has(id)
        return { to: widget.to, widget: isPattern ? new PatternPreviewWidget(id, patternPreviews.source) : new InlineWidget(widget) }
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
                EditorView.domEventHandlers({ keydown: createKeyHandler(() => evaluate(view), onStop) }),
                keymap.of([
                    indentWithTab,
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...historyKeymap,
                ]),
                highlightExtension,
                flashField,
                widgetField,
                remeasureOnResize,
                sliderPlugin,
                blockMarkers,
                createToggles(evaluate),
                bracketColors,
                tokenColors,
                warningLines.extension,
                errorLines.extension,
                bracketMatching(),
                theme,
            ],
        }),
    })

    return {
        evaluate: () => evaluate(view),
        setCode: (code) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }),
        showEvaluation: ({ miniLocations, widgets, imagePreviews, patternPreviews: shownPatterns }) => {
            for (const { id, element } of imagePreviews) {
                setWidget(id, element)
            }

            patternPreviews.show(shownPatterns)
            updateMiniLocations(view, miniLocations)
            view.dispatch({ effects: setWidgets.of(widgets.filter((widget) => previewNames.includes(widget.type)).map(placeWidget)) })
            updateSliderWidgets(view, widgets)
        },
        highlight: (time, haps) => {
            highlightMiniLocations(view, time, haps)
            patternPreviews.setTime(time)
        },
        showWarnings: (messages) => view.dispatch({ effects: warningLines.setMessages.of(messages) }),
        showErrors: (messages) => view.dispatch({ effects: errorLines.setMessages.of(messages) }),
        destroy: () => view.destroy(),
    }
}
