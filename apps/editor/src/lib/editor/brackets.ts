import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

export const bracketDepths = 3

const openingBrackets = new Set(['(', '[', '{'])

const closingBrackets = new Set([')', ']', '}'])

const depthMarks = Array.from({ length: bracketDepths }, (_value, depth) => Decoration.mark({ class: `cm-bracket-${depth}` }))

const getDepthMark = (depth: number) => depthMarks[((depth % bracketDepths) + bracketDepths) % bracketDepths]

const createBracketMarks = (state: EditorState): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>()
    let depth = 0

    syntaxTree(state).iterate({
        enter: (node) => {
            if (openingBrackets.has(node.name)) {
                builder.add(node.from, node.to, getDepthMark(depth))
                depth += 1
            }

            if (closingBrackets.has(node.name)) {
                depth -= 1
                builder.add(node.from, node.to, getDepthMark(depth))
            }
        },
    })

    return builder.finish()
}

export const bracketColors = StateField.define<DecorationSet>({
    create: createBracketMarks,
    update: (value, transaction) => {
        const hasChanged = transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
        return hasChanged ? createBracketMarks(transaction.state) : value
    },
    provide: (field) => EditorView.decorations.from(field),
})
