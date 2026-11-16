import { RangeSet, type EditorState, type Range } from '@codemirror/state'
import { GutterMarker, gutterLineClass } from '@codemirror/view'
import type { Kind } from '@lovechild/strudel'
import { readKinds } from './kinds'
import { createSyntaxField } from './syntax'

type TrackKind = 'image' | 'sound'

class LineMarker extends GutterMarker {
    constructor(kind: TrackKind) {
        super()
        this.elementClass = `cm-${kind}-track`
    }
}

const lineMarkers: Record<TrackKind, GutterMarker> = {
    image: new LineMarker('image'),
    sound: new LineMarker('sound'),
}

const trackKinds: Record<Kind, TrackKind> = {
    image: 'image',
    text: 'image',
    sound: 'sound',
    neutral: 'sound',
}

const findLines = (state: EditorState) => {
    const lines: Array<Range<GutterMarker>> = []

    for (const { from, to, kind } of readKinds(state).blocks) {
        if (!kind) {
            continue
        }

        const last = state.doc.lineAt(to).number

        for (let number = state.doc.lineAt(from).number; number <= last; number += 1) {
            lines.push(lineMarkers[trackKinds[kind]].range(state.doc.line(number).from))
        }
    }

    return RangeSet.of(lines, true)
}

const lineField = createSyntaxField(findLines)

export const trackMarkers = [lineField, gutterLineClass.from(lineField)]
