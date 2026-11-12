import { syntaxTree } from '@codemirror/language'
import { RangeSet, type EditorState, type Range } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, gutterLineClass, type DecorationSet } from '@codemirror/view'
import { getBlockName, isImageFunction, isName } from '@lovechild/strudel'
import type { SyntaxNode } from '@lezer/common'
import { createSyntaxField } from './syntax'

type Kind = 'image' | 'sound'

interface Marks { lines: RangeSet<GutterMarker>, names: DecorationSet }

class LineMarker extends GutterMarker {
    constructor(kind: Kind) {
        super()
        this.elementClass = `cm-${kind}-block`
    }
}

const lineMarkers: Record<Kind, GutterMarker> = {
    image: new LineMarker('image'),
    sound: new LineMarker('sound'),
}

const nameMarks: Record<Kind, Decoration> = {
    image: Decoration.mark({ class: 'cm-image-name' }),
    sound: Decoration.mark({ class: 'cm-sound-name' }),
}

const chainNodes = new Set(['ExpressionStatement', 'CallExpression', 'MemberExpression', 'ParenthesizedExpression'])

const findStart = (node: SyntaxNode | null): SyntaxNode | null => {
    if (node === null || !chainNodes.has(node.name)) {
        return node
    }

    const inner = node.name === 'ParenthesizedExpression' ? node.firstChild?.nextSibling : node.firstChild
    return findStart(inner ?? null)
}

const getSiblings = (node: SyntaxNode | null): Array<SyntaxNode> => node === null ? [] : [node, ...getSiblings(node.nextSibling)]

const findMarks = (state: EditorState): Marks => {
    const kinds = new Map<string, Kind | undefined>()
    const lines: Array<Range<GutterMarker>> = []
    const names: Array<Range<Decoration>> = []

    const readText = (node: SyntaxNode) => state.sliceDoc(node.from, node.to)

    const classify = (node: SyntaxNode | null): Kind | undefined => {
        const start = findStart(node)

        if (start?.name !== 'VariableName') {
            return undefined
        }

        const name = readText(start)

        if (isImageFunction(name)) {
            return 'image'
        }

        if (kinds.has(name) || isName(name)) {
            return kinds.get(name)
        }

        return 'sound'
    }

    const markLines = (node: SyntaxNode, kind: Kind) => {
        const last = state.doc.lineAt(node.to).number

        for (let number = state.doc.lineAt(node.from).number; number <= last; number += 1) {
            lines.push(lineMarkers[kind].range(state.doc.line(number).from))
        }
    }

    const markName = (node: SyntaxNode, kind: Kind) => {
        names.push(nameMarks[kind].range(node.from, node.to))
    }

    const recordVariable = (declaration: SyntaxNode) => {
        const definition = declaration.getChild('VariableDefinition')
        const value = definition?.nextSibling?.nextSibling ?? null

        if (definition) {
            kinds.set(readText(definition), classify(value))
        }
    }

    const recordBlock = (statement: SyntaxNode) => {
        const label = statement.getChild('Label')

        if (!label) {
            return
        }

        const name = getBlockName(readText(label))
        const kind = classify(statement.lastChild)

        if (isName(name)) {
            kinds.set(name, kind)
        }

        if (kind) {
            markLines(statement, kind)
            markName(label, kind)
        }
    }

    for (const statement of getSiblings(syntaxTree(state).topNode.firstChild)) {
        if (statement.name === 'VariableDeclaration') {
            recordVariable(statement)
        }

        if (statement.name === 'LabeledStatement') {
            recordBlock(statement)
        }
    }

    syntaxTree(state).iterate({
        enter: ({ node }) => {
            const name = readText(node)
            const kind = node.name === 'VariableName' && isName(name) ? kinds.get(name) : undefined

            if (kind) {
                markName(node, kind)
            }
        },
    })

    return { lines: RangeSet.of(lines, true), names: Decoration.set(names, true) }
}

const markField = createSyntaxField(findMarks)

export const blockMarkers = [
    markField,
    gutterLineClass.from(markField, (marks) => marks.lines),
    EditorView.decorations.from(markField, (marks) => marks.names),
]
