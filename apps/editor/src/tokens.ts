import { syntaxTree } from '@codemirror/language'
import { StateField, type EditorState, type Range } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { textStyleNames } from '@lovechild/strudel'
import type { SyntaxNode } from '@lezer/common'

const textFunction = 'text'

const textStyles = new Set(textStyleNames)

const patternStringMark = Decoration.mark({ class: 'cm-pattern-string' })

const textMark = Decoration.mark({ class: 'cm-text-function' })

const isPatternString = (state: EditorState, node: SyntaxNode) => node.name === 'TemplateString' || (node.name === 'String' && state.sliceDoc(node.from, node.from + 1) === '"')

const findStyleMethods = (state: EditorState, call: SyntaxNode): Array<SyntaxNode> => {
    const member = call.parent

    if (member?.name !== 'MemberExpression' || member.firstChild?.from !== call.from || member.parent?.name !== 'CallExpression') {
        return []
    }

    const property = member.lastChild

    if (property?.name !== 'PropertyName' || !textStyles.has(state.sliceDoc(property.from, property.to))) {
        return []
    }

    return [property, ...findStyleMethods(state, member.parent)]
}

const findTextCalls = (state: EditorState, node: SyntaxNode) => {
    const call = node.parent

    if (node.name !== 'VariableName' || call?.name !== 'CallExpression' || call.firstChild?.from !== node.from || state.sliceDoc(node.from, node.to) !== textFunction) {
        return []
    }

    return [node, ...findStyleMethods(state, call)]
}

const createTokenMarks = (state: EditorState): DecorationSet => {
    const marks: Array<Range<Decoration>> = []

    syntaxTree(state).iterate({
        enter: (reference) => {
            const { node } = reference

            if (isPatternString(state, node)) {
                marks.push(patternStringMark.range(node.from, node.to))
                return false
            }

            for (const name of findTextCalls(state, node)) {
                marks.push(textMark.range(name.from, name.to))
            }

            return undefined
        },
    })

    return Decoration.set(marks, true)
}

export const tokenColors = StateField.define<DecorationSet>({
    create: createTokenMarks,
    update: (value, transaction) => {
        const hasChanged = transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
        return hasChanged ? createTokenMarks(transaction.state) : value
    },
    provide: (field) => EditorView.decorations.from(field),
})
