import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import type { Medium } from '@lovechild/strudel/editor'
import type { SyntaxNode } from '@lezer/common'
import { readMediums } from './mediums'
import { createSyntaxField } from './syntax'

const patternStringMark = Decoration.mark({ class: 'cm-pattern-string' })

const createMediumMark = (medium: Medium, isQuiet: boolean) => Decoration.mark({ class: `cm-medium-${medium}` + (isQuiet ? ' cm-quiet' : '') })

const mediums: ReadonlyArray<Medium> = ['image', 'text', 'sound', 'neutral']

const loudMarks = new Map(mediums.map((medium) => [medium, createMediumMark(medium, false)]))

const quietMarks = new Map(mediums.map((medium) => [medium, createMediumMark(medium, true)]))

const getMediumMark = (medium: Medium, isQuiet: boolean) => (isQuiet ? quietMarks : loudMarks).get(medium) ?? createMediumMark(medium, isQuiet)

const readText = (state: EditorState, node: SyntaxNode) => state.sliceDoc(node.from, node.to)

const isTrackName = (state: EditorState, node: SyntaxNode) => {
    const member = node.parent?.name === 'ArgList' ? node.parent.parent?.firstChild : null
    return member?.name === 'MemberExpression' && member.lastChild !== null && readText(state, member.lastChild) === 'track'
}

const isPatternString = (state: EditorState, node: SyntaxNode) => node.name === 'TemplateString' || (node.name === 'String' && state.sliceDoc(node.from, node.from + 1) === '"' && !isTrackName(state, node))

const findTokenMarks = (state: EditorState): DecorationSet => {
    const marks: Array<Range<Decoration>> = readMediums(state).marks.map(({ from, to, medium, isQuiet }) => getMediumMark(medium, isQuiet).range(from, to))

    syntaxTree(state).iterate({
        enter: ({ node }) => {
            if (isPatternString(state, node)) {
                marks.push(patternStringMark.range(node.from, node.to))
                return false
            }

            return undefined
        },
    })

    return Decoration.set(marks, true)
}

const tokenField = createSyntaxField(findTokenMarks)

export const tokenColors = [tokenField, EditorView.decorations.from(tokenField)]
