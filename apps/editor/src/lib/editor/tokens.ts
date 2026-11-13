import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { isTextStyle } from '@lovechild/strudel'
import type { SyntaxNode } from '@lezer/common'
import { createSyntaxField } from './syntax'

const textFunction = 'text'

const patternStringMark = Decoration.mark({ class: 'cm-pattern-string' })

const textMark = Decoration.mark({ class: 'cm-text-function' })

const readText = (state: EditorState, node: SyntaxNode) => state.sliceDoc(node.from, node.to)

const isTrackName = (state: EditorState, node: SyntaxNode) => {
    const member = node.parent?.name === 'ArgList' ? node.parent.parent?.firstChild : null
    return member?.name === 'MemberExpression' && member.lastChild !== null && readText(state, member.lastChild) === 'track'
}

const isPatternString = (state: EditorState, node: SyntaxNode) => node.name === 'TemplateString' || (node.name === 'String' && state.sliceDoc(node.from, node.from + 1) === '"' && !isTrackName(state, node))

const isStyleMethod = (state: EditorState, node: SyntaxNode) => node.name === 'PropertyName' && isTextStyle(readText(state, node))

const getParentIfFirst = (node: SyntaxNode, name: string) => node.parent?.name === name && node.parent.firstChild?.from === node.from ? node.parent : null

const findStyleMethods = (state: EditorState, call: SyntaxNode): Array<SyntaxNode> => {
    const member = getParentIfFirst(call, 'MemberExpression')
    const nextCall = member && getParentIfFirst(member, 'CallExpression')
    const method = member?.lastChild

    if (!nextCall || !method || !isStyleMethod(state, method)) {
        return []
    }

    return [method, ...findStyleMethods(state, nextCall)]
}

const findTextCall = (state: EditorState, node: SyntaxNode) => {
    const call = getParentIfFirst(node, 'CallExpression')

    if (!call || node.name !== 'VariableName' || readText(state, node) !== textFunction) {
        return []
    }

    return [node, ...findStyleMethods(state, call)]
}

const findTokenMarks = (state: EditorState): DecorationSet => {
    const marks: Array<Range<Decoration>> = []

    syntaxTree(state).iterate({
        enter: ({ node }) => {
            if (isPatternString(state, node)) {
                marks.push(patternStringMark.range(node.from, node.to))
                return false
            }

            for (const name of findTextCall(state, node)) {
                marks.push(textMark.range(name.from, name.to))
            }

            return undefined
        },
    })

    return Decoration.set(marks, true)
}

const tokenField = createSyntaxField(findTokenMarks)

export const tokenColors = [tokenField, EditorView.decorations.from(tokenField)]
