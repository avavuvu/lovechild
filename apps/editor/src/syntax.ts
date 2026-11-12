import { syntaxTree } from '@codemirror/language'
import { StateField, type EditorState } from '@codemirror/state'

export const createSyntaxField = <T>(compute: (state: EditorState) => T) => StateField.define<T>({
    create: compute,
    update: (value, transaction) => {
        const hasChanged = transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
        return hasChanged ? compute(transaction.state) : value
    },
})
