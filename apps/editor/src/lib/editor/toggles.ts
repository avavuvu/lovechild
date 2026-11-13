import { syntaxTree } from '@codemirror/language'
import { RangeSet, type EditorState, type Range } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, lineNumberMarkers, lineNumbers, WidgetType, type BlockInfo, type DecorationSet } from '@codemirror/view'
import { getTrackName } from '@lovechild/strudel'
import type { SyntaxNode } from '@lezer/common'
import { createSyntaxField } from './syntax'

interface Toggles { booleans: DecorationSet, tracks: RangeSet<GutterMarker>, mutedLines: DecorationSet }

const createCheckbox = (className: string, isChecked: boolean, title: string) => {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = className
    input.checked = isChecked
    input.title = title
    return input
}

class BooleanWidget extends WidgetType {
    readonly isChecked: boolean

    constructor(isChecked: boolean) {
        super()
        this.isChecked = isChecked
    }

    eq(other: BooleanWidget) {
        return other.isChecked === this.isChecked
    }

    toDOM() {
        return createCheckbox('cm-boolean-toggle', this.isChecked, 'Switch true or false')
    }

    ignoreEvent() {
        return false
    }
}

class TrackMarker extends GutterMarker {
    readonly isChecked: boolean

    constructor(isChecked: boolean) {
        super()
        this.isChecked = isChecked
        this.elementClass = 'cm-track-cell'
    }

    eq(other: TrackMarker) {
        return other.isChecked === this.isChecked
    }

    toDOM() {
        return createCheckbox('cm-track-toggle', this.isChecked, 'Play or mute this track')
    }
}

const isMutedLabel = (label: string) => label !== getTrackName(label)

const mutedLine = Decoration.line({ class: 'cm-muted-track' })

const getSiblings = (node: SyntaxNode | null): Array<SyntaxNode> => node === null ? [] : [node, ...getSiblings(node.nextSibling)]

const findLabels = (state: EditorState) => getSiblings(syntaxTree(state).topNode.firstChild)
    .map((statement) => statement.name === 'LabeledStatement' ? statement.getChild('Label') : null)
    .filter((label) => label !== null)

const findToggles = (state: EditorState): Toggles => {
    const booleans: Array<Range<Decoration>> = []
    const mutedLines: Array<Range<Decoration>> = []

    const markMuted = (statement: SyntaxNode) => {
        const last = state.doc.lineAt(statement.to).number

        for (let number = state.doc.lineAt(statement.from).number; number <= last; number += 1) {
            mutedLines.push(mutedLine.range(state.doc.line(number).from))
        }
    }

    const tracks = findLabels(state).map((label) => {
        const isPlaying = !isMutedLabel(state.sliceDoc(label.from, label.to))

        if (!isPlaying && label.parent) {
            markMuted(label.parent)
        }

        return new TrackMarker(isPlaying).range(state.doc.lineAt(label.from).from)
    })

    syntaxTree(state).iterate({
        enter: ({ node }) => {
            if (node.name === 'BooleanLiteral') {
                const isTrue = state.sliceDoc(node.from, node.to) === 'true'
                booleans.push(Decoration.widget({ widget: new BooleanWidget(isTrue), side: -1 }).range(node.from))
            }
        },
    })

    return { booleans: Decoration.set(booleans, true), tracks: RangeSet.of(tracks, true), mutedLines: Decoration.set(mutedLines, true) }
}

const toggleField = createSyntaxField(findToggles)

const flipBoolean = (state: EditorState, position: number) => {
    const literal = syntaxTree(state).resolveInner(position, 1)

    if (literal.name !== 'BooleanLiteral') {
        return undefined
    }

    const isTrue = state.sliceDoc(literal.from, literal.to) === 'true'
    return { from: literal.from, to: literal.to, insert: isTrue ? 'false' : 'true' }
}

const flipTrack = (state: EditorState, line: BlockInfo) => {
    const label = findLabels(state).find((candidate) => candidate.from >= line.from && candidate.from <= line.to)

    if (!label) {
        return undefined
    }

    const text = state.sliceDoc(label.from, label.to)
    return { from: label.from, to: label.to, insert: isMutedLabel(text) ? getTrackName(text) : '_' + text }
}

const isToggle = (target: EventTarget | null, className: string): target is HTMLInputElement => target instanceof HTMLInputElement && target.classList.contains(className)

export const createToggles = (onToggle: (view: EditorView) => void) => {
    const applyChange = (view: EditorView, event: Event, change: ReturnType<typeof flipBoolean>) => {
        event.preventDefault()

        if (change) {
            view.dispatch({ changes: change })
            onToggle(view)
        }

        return true
    }

    return [
        toggleField,
        EditorView.decorations.from(toggleField, (toggles) => toggles.booleans),
        EditorView.decorations.from(toggleField, (toggles) => toggles.mutedLines),
        lineNumberMarkers.from(toggleField, (toggles) => toggles.tracks),
        lineNumbers({
            domEventHandlers: {
                mousedown: (view, line, event) => isToggle(event.target, 'cm-track-toggle') && applyChange(view, event, flipTrack(view.state, line)),
            },
        }),
        EditorView.domEventHandlers({
            mousedown: (event, view) => isToggle(event.target, 'cm-boolean-toggle') && applyChange(view, event, flipBoolean(view.state, view.posAtDOM(event.target))),
        }),
    ]
}
