import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, GutterMarker, gutterLineClass } from '@codemirror/view'
import { getBlockName, imageFunctionNames, isName } from '@lovechild/strudel'
import type { SyntaxNode } from '@lezer/common'

type BlockKind = 'image' | 'sound'

interface Range { from: number, to: number, kind: BlockKind }

interface Blocks { lines: ReadonlyArray<Range>, names: ReadonlyArray<Range> }

const imageFunctions = new Set(imageFunctionNames)

const chainNodes = new Set(['ExpressionStatement', 'CallExpression', 'MemberExpression', 'ParenthesizedExpression'])

const stringNodes = new Set(['String', 'TemplateString'])

const getInner = (node: SyntaxNode) => node.name === 'ParenthesizedExpression' ? node.firstChild?.nextSibling ?? null : node.firstChild

const findRoot = (node: SyntaxNode | null): SyntaxNode | null => node !== null && chainNodes.has(node.name) ? findRoot(getInner(node)) : node

const findBlocks = (state: EditorState): Blocks => {
    const kinds = new Map<string, BlockKind | undefined>()
    const lines: Array<Range> = []
    const labels: Array<Range> = []

    const readText = (node: SyntaxNode) => state.sliceDoc(node.from, node.to)

    const classifyRoot = (root: SyntaxNode | null): BlockKind | undefined => {
        if (root === null) {
            return undefined
        }

        if (stringNodes.has(root.name)) {
            return 'sound'
        }

        if (root.name !== 'VariableName') {
            return undefined
        }

        const name = readText(root)

        if (imageFunctions.has(name)) {
            return 'image'
        }

        if (kinds.has(name) || isName(name)) {
            return kinds.get(name)
        }

        return 'sound'
    }

    for (let statement = syntaxTree(state).topNode.firstChild; statement; statement = statement.nextSibling) {
        if (statement.name === 'VariableDeclaration') {
            const definition = statement.getChild('VariableDefinition')

            if (definition) {
                kinds.set(readText(definition), classifyRoot(findRoot(definition.nextSibling?.nextSibling ?? null)))
            }
        }

        if (statement.name === 'LabeledStatement') {
            const label = statement.getChild('Label')
            const kind = classifyRoot(findRoot(statement.lastChild))
            const name = label ? getBlockName(readText(label)) : ''

            if (isName(name)) {
                kinds.set(name, kind)
            }

            if (kind) {
                lines.push({ from: statement.from, to: statement.to, kind })
            }

            if (kind && label) {
                labels.push({ from: label.from, to: label.to, kind })
            }
        }
    }

    const references: Array<Range> = []

    syntaxTree(state).iterate({
        enter: (node) => {
            const kind = node.name === 'VariableName' ? kinds.get(readText(node.node)) : undefined

            if (kind && isName(readText(node.node))) {
                references.push({ from: node.from, to: node.to, kind })
            }
        },
    })

    return { lines, names: [...labels, ...references].sort((first, second) => first.from - second.from) }
}

class BlockMarker extends GutterMarker {
    constructor(kind: BlockKind) {
        super()
        this.elementClass = `cm-${kind}-block`
    }
}

const markers: Record<BlockKind, BlockMarker> = {
    image: new BlockMarker('image'),
    sound: new BlockMarker('sound'),
}

const nameMarks: Record<BlockKind, Decoration> = {
    image: Decoration.mark({ class: 'cm-image-name' }),
    sound: Decoration.mark({ class: 'cm-sound-name' }),
}

const createMarkers = (state: EditorState, lines: ReadonlyArray<Range>) => {
    const builder = new RangeSetBuilder<GutterMarker>()

    for (const block of lines) {
        const last = state.doc.lineAt(block.to).number

        for (let number = state.doc.lineAt(block.from).number; number <= last; number += 1) {
            const line = state.doc.line(number)
            builder.add(line.from, line.from, markers[block.kind])
        }
    }

    return builder.finish()
}

const createNameMarks = (names: ReadonlyArray<Range>) => {
    const builder = new RangeSetBuilder<Decoration>()

    for (const name of names) {
        builder.add(name.from, name.to, nameMarks[name.kind])
    }

    return builder.finish()
}

const blockField = StateField.define<Blocks>({
    create: findBlocks,
    update: (value, transaction) => {
        const hasChanged = transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
        return hasChanged ? findBlocks(transaction.state) : value
    },
})

export const blockMarkers = [
    blockField,
    gutterLineClass.compute([blockField], (state) => createMarkers(state, state.field(blockField).lines)),
    EditorView.decorations.compute([blockField], (state) => createNameMarks(state.field(blockField).names)),
]
