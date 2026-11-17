import { RangeSet, type EditorState, type Range } from '@codemirror/state'
import { GutterMarker, gutterLineClass } from '@codemirror/view'
import type { Medium } from '@lovechild/strudel/editor'
import { readMediums } from './mediums'
import { createSyntaxField } from './syntax'

type BlockMedium = 'image' | 'sound'

class LineMarker extends GutterMarker {
    constructor(medium: BlockMedium) {
        super()
        this.elementClass = `cm-${medium}-block`
    }
}

const lineMarkers: Record<BlockMedium, GutterMarker> = {
    image: new LineMarker('image'),
    sound: new LineMarker('sound'),
}

const blockMediums: Record<Medium, BlockMedium> = {
    image: 'image',
    text: 'image',
    sound: 'sound',
    neutral: 'sound',
}

const findLines = (state: EditorState) => {
    const lines: Array<Range<GutterMarker>> = []

    for (const { from, to, medium } of readMediums(state).blocks) {
        if (!medium) {
            continue
        }

        const last = state.doc.lineAt(to).number

        for (let number = state.doc.lineAt(from).number; number <= last; number += 1) {
            lines.push(lineMarkers[blockMediums[medium]].range(state.doc.line(number).from))
        }
    }

    return RangeSet.of(lines, true)
}

const lineField = createSyntaxField(findLines)

export const blockMarkers = [lineField, gutterLineClass.from(lineField)]
