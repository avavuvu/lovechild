import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { bracketDepths } from './brackets'

const settings = {
    foreground: '#fff',
    caret: '#ffcc00',
    selection: 'rgba(128, 203, 196, 0.5)',
    selectionMatch: '#036dd626',
    lineBackground: '#22222299',
    gutterForeground: '#8a919966',
    keyword: '#c792ea',
    variableName: '#c792ea',
    definition: '#82aaff',
    specialVariable: '#eeffff',
    propertyName: '#c792ea',
    string: '#c3e88d',
    number: '#c3e88d',
    atom: '#f78c6c',
    bool: '#89ddff',
    label: '#89ddff',
    operator: '#89ddff',
    punctuation: '#82aaff',
    comment: '#7d8799',
    typeName: '#c3e88d',
    className: '#decb6b',
    meta: '#ffcb6b',
    invalid: '#fff',
    imageBlock: '#4fd6be',
    soundBlock: '#ff757f',
    brackets: ['#179fff', '#da70d6', '#ffd700'],
    matchingBracket: '#ffffff33',
}

const bracketRules = Object.fromEntries(Array.from({ length: bracketDepths }, (_value, depth) => [
    `.cm-bracket-${depth}, .cm-bracket-${depth} *`,
    { color: settings.brackets[depth] },
]))

const layout = EditorView.theme({
    '&': {
        height: '100%',
        color: settings.foreground,
        backgroundColor: 'transparent',
        fontSize: '18px',
    },
    '&.cm-focused': {
        outline: 'none',
    },
    '.cm-content': {
        caretColor: settings.caret,
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: settings.caret,
    },
    '&.cm-focused .cm-selectionBackground, & .cm-line::selection, & .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection': {
        background: `${settings.selection} !important`,
    },
    '& .cm-selectionMatch': {
        backgroundColor: settings.selectionMatch,
    },
    '.cm-line': {
        width: 'fit-content',
        background: settings.lineBackground,
    },
    '.cm-gutters': {
        background: 'transparent',
        color: settings.gutterForeground,
        border: 'none',
    },
    '.cm-gutterElement': {
        background: settings.lineBackground,
    },
    '.cm-content > canvas': {
        display: 'block',
    },
    '.cm-gutterElement.cm-image-block, .cm-image-name, .cm-image-name *': {
        color: settings.imageBlock,
    },
    '.cm-gutterElement.cm-sound-block, .cm-sound-name, .cm-sound-name *': {
        color: settings.soundBlock,
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: settings.matchingBracket,
    },
    ...bracketRules,
}, { dark: true })

const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: settings.keyword },
    { tag: tags.variableName, color: settings.variableName },
    { tag: tags.definition(tags.variableName), color: settings.definition },
    { tag: tags.special(tags.variableName), color: settings.specialVariable },
    { tag: tags.propertyName, color: settings.propertyName },
    { tag: [tags.string, tags.special(tags.string)], color: settings.string },
    { tag: tags.number, color: settings.number },
    { tag: tags.atom, color: settings.atom },
    { tag: tags.bool, color: settings.bool },
    { tag: tags.labelName, color: settings.label },
    { tag: tags.operator, color: settings.operator },
    { tag: tags.punctuation, color: settings.punctuation },
    { tag: tags.comment, color: settings.comment },
    { tag: tags.typeName, color: settings.typeName },
    { tag: tags.className, color: settings.className },
    { tag: tags.meta, color: settings.meta },
    { tag: tags.invalid, color: settings.invalid },
])

export const theme = [layout, syntaxHighlighting(highlightStyle)]
