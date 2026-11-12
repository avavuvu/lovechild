import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { bracketDepths } from './brackets'

const bracketRules = Object.fromEntries(Array.from({ length: bracketDepths }, (_value, depth) => [
    `.cm-bracket-${depth}, .cm-bracket-${depth} *`,
    { color: `var(--color-syntax-bracket-${depth})` },
]))

const layout = EditorView.theme({
    '&': {
        height: '100%',
        color: 'var(--color-syntax-foreground)',
        backgroundColor: 'transparent',
        fontSize: 'var(--code-font-size)',
    },
    '&.cm-focused': {
        outline: 'none',
    },
    '.cm-content': {
        caretColor: 'var(--color-caret)',
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--color-caret)',
    },
    '&.cm-focused .cm-selectionBackground, & .cm-line::selection, & .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection': {
        background: 'var(--color-selection) !important',
    },
    '& .cm-selectionMatch': {
        backgroundColor: 'var(--color-selection-match)',
    },
    '.cm-line': {
        width: 'fit-content',
    },
    '.cm-line, .cm-line-message, .cm-gutterElement': {
        background: 'var(--color-line-background)',
        backdropFilter: 'var(--line-filter)',
    },
    '.cm-gutters': {
        background: 'transparent',
        color: 'var(--color-gutter)',
        border: 'none',
    },
    '.cm-content > canvas': {
        display: 'block',
    },
    '.cm-gutterElement.cm-image-block, .cm-image-name, .cm-image-name *': {
        color: 'var(--color-image)',
    },
    '.cm-gutterElement.cm-sound-block, .cm-sound-name, .cm-sound-name *': {
        color: 'var(--color-sound)',
    },
    '.cm-pattern-string, .cm-pattern-string *': {
        color: 'var(--color-syntax-pattern-string)',
    },
    '.cm-text-function, .cm-text-function *': {
        color: 'var(--color-text)',
    },
    '.cm-line.cm-warning-line': {
        background: 'var(--color-warning-line)',
    },
    '.cm-line.cm-error-line': {
        background: 'var(--color-error-line)',
    },
    '.cm-line-message': {
        width: 'fit-content',
        padding: '0 6px 0 2ch',
    },
    '.cm-warning-message': {
        fontSize: '0.85em',
        color: 'var(--color-warning)',
    },
    '.cm-error-message': {
        color: 'var(--color-error)',
        background: 'none',
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'var(--color-matching-bracket)',
    },
    ...bracketRules,
})

const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: 'var(--color-syntax-keyword)' },
    { tag: tags.variableName, color: 'var(--color-syntax-variable)' },
    { tag: tags.definition(tags.variableName), color: 'var(--color-syntax-definition)' },
    { tag: tags.special(tags.variableName), color: 'var(--color-syntax-special-variable)' },
    { tag: tags.propertyName, color: 'var(--color-syntax-property)' },
    { tag: [tags.string, tags.special(tags.string)], color: 'var(--color-syntax-string)' },
    { tag: tags.number, color: 'var(--color-syntax-number)' },
    { tag: tags.atom, color: 'var(--color-syntax-atom)' },
    { tag: tags.bool, color: 'var(--color-syntax-bool)' },
    { tag: tags.labelName, color: 'var(--color-syntax-label)' },
    { tag: tags.operator, color: 'var(--color-syntax-operator)' },
    { tag: tags.punctuation, color: 'var(--color-syntax-punctuation)' },
    { tag: tags.comment, color: 'var(--color-syntax-comment)' },
    { tag: tags.typeName, color: 'var(--color-syntax-type)' },
    { tag: tags.className, color: 'var(--color-syntax-class)' },
    { tag: tags.meta, color: 'var(--color-syntax-meta)' },
    { tag: tags.invalid, color: 'var(--color-syntax-invalid)' },
])

export const theme = [layout, syntaxHighlighting(highlightStyle)]
