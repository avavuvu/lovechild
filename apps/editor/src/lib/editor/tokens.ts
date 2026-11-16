import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import type { Kind } from '@lovechild/strudel'
import type { SyntaxNode } from '@lezer/common'
import { readKinds } from './kinds'
import { createSyntaxField } from './syntax'

const patternStringMark = Decoration.mark({ class: 'cm-pattern-string' })

const createKindMark = (kind: Kind, isQuiet: boolean) => Decoration.mark({ class: `cm-kind-${kind}` + (isQuiet ? ' cm-quiet' : '') })

const kinds: ReadonlyArray<Kind> = ['image', 'text', 'sound', 'neutral']

const loudMarks = new Map(kinds.map((kind) => [kind, createKindMark(kind, false)]))

const quietMarks = new Map(kinds.map((kind) => [kind, createKindMark(kind, true)]))

const getKindMark = (kind: Kind, isQuiet: boolean) => (isQuiet ? quietMarks : loudMarks).get(kind) ?? createKindMark(kind, isQuiet)

const readText = (state: EditorState, node: SyntaxNode) => state.sliceDoc(node.from, node.to)

const isTrackName = (state: EditorState, node: SyntaxNode) => {
    const member = node.parent?.name === 'ArgList' ? node.parent.parent?.firstChild : null
    return member?.name === 'MemberExpression' && member.lastChild !== null && readText(state, member.lastChild) === 'track'
}

const isPatternString = (state: EditorState, node: SyntaxNode) => node.name === 'TemplateString' || (node.name === 'String' && state.sliceDoc(node.from, node.from + 1) === '"' && !isTrackName(state, node))

const findTokenMarks = (state: EditorState): DecorationSet => {
    const marks: Array<Range<Decoration>> = readKinds(state).marks.map(({ from, to, kind, isQuiet }) => getKindMark(kind, isQuiet).range(from, to))

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
