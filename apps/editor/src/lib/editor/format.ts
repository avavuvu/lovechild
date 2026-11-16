import { isolateHistory } from '@codemirror/commands'
import { Transaction } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { formatCode } from '@lovechild/strudel'

interface Change {
    from: number
    to: number
    insert: string
}

const isLayoutCharacter = (character: string | undefined) => character === ' ' || character === '\t' || character === '\n' || character === '\r' || character === ';'

const findChanges = (before: string, after: string): Array<Change> | undefined => {
    const changes: Array<Change> = []
    let beforeIndex = 0
    let afterIndex = 0

    const addChange = (from: number, to: number, insert: string) => {
        const last = changes[changes.length - 1]

        if (last && last.to === from) {
            last.to = to
            last.insert += insert
        } else {
            changes.push({ from, to, insert })
        }
    }

    while (beforeIndex < before.length || afterIndex < after.length) {
        if (beforeIndex < before.length && afterIndex < after.length && before[beforeIndex] === after[afterIndex]) {
            beforeIndex += 1
            afterIndex += 1
        } else if (isLayoutCharacter(before[beforeIndex])) {
            addChange(beforeIndex, beforeIndex + 1, '')
            beforeIndex += 1
        } else if (isLayoutCharacter(after[afterIndex]) || after[afterIndex] === '0') {
            addChange(beforeIndex, beforeIndex, after[afterIndex])
            afterIndex += 1
        } else {
            return undefined
        }
    }

    return changes
}

export const formatView = (view: EditorView) => {
    const before = view.state.doc.toString()
    const after = formatCode(before)

    if (after === undefined || after === before) {
        return
    }

    view.dispatch({
        changes: findChanges(before, after) ?? [{ from: 0, to: before.length, insert: after }],
        annotations: [isolateHistory.of('full'), Transaction.userEvent.of('format')],
    })
}
