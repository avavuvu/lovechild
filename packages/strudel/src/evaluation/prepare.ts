import { tokTypes, type AnyNode, type Program, type Token, type TokenType, type VariableDeclaration } from 'acorn'
import { readSketch, type Sketch } from './locations'
import { getBlockName, isMuted, isName } from './names'
import { parseCode, visit } from './syntax'

export interface Prepared {
    code: string
    mutedNames: ReadonlySet<string>
    sketch: Sketch
}

interface Opening {
    after: number
    type: TokenType
}

type Edits = Map<number, string>

const lineBreak = /[\n\r\u2028\u2029]/

const nameMethod = 'track'

const readOpening = (node: AnyNode): Opening | undefined => {
    if (node.type === 'CallExpression' && !node.optional) {
        return { after: node.callee.end, type: tokTypes.parenL }
    }

    if (node.type === 'MemberExpression' && node.computed && !node.optional) {
        return { after: node.object.end, type: tokTypes.bracketL }
    }

    if (node.type === 'TaggedTemplateExpression') {
        return { after: node.tag.end, type: tokTypes.backQuote }
    }

    return undefined
}

const findBreak = (code: string, tokens: ReadonlyArray<Token>, { after, type }: Opening) => {
    const index = tokens.findIndex((token) => token.start >= after && token.type === type)

    if (index < 1) {
        return undefined
    }

    const previous = tokens[index - 1]
    const isOnNewLine = lineBreak.test(code.slice(previous.end, tokens[index].start))
    const isReplaceable = /\s/.test(code.charAt(previous.end))

    return isOnNewLine && isReplaceable ? previous.end : undefined
}

const separate = (code: string, tokens: ReadonlyArray<Token>, node: AnyNode, edits: Edits) => {
    const opening = readOpening(node)
    const position = opening && findBreak(code, tokens, opening)

    if (position !== undefined) {
        edits.set(position, ';')
    }
}

const isNameDeclaration = (node: AnyNode): node is VariableDeclaration => node.type === 'VariableDeclaration'
    && node.declarations.every((declaration) => declaration.id.type === 'Identifier' && isName(declaration.id.name) && declaration.init !== null && declaration.init !== undefined)

const bindNames = (program: Program, edits: Edits) => {
    for (const node of program.body.filter(isNameDeclaration)) {
        for (let index = 0; index < node.kind.length; index += 1) {
            edits.set(node.start + index, ' ')
        }
    }
}

const readNamedLabel = (node: AnyNode) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier' || node.callee.property.name !== nameMethod) {
        return undefined
    }

    const [argument] = node.arguments
    return argument?.type === 'Literal' && typeof argument.value === 'string' ? { argument, label: argument.value } : undefined
}

const applyEdits = (code: string, edits: Edits) => edits.size === 0 ? code : code.split('').map((character, index) => edits.get(index) ?? character).join('')

export const separateStatements = (code: string) => {
    const parsed = parseCode(code)

    if (!parsed) {
        return code
    }

    const edits: Edits = new Map()
    visit(parsed.program, (node) => separate(code, parsed.tokens, node, edits))
    return applyEdits(code, edits)
}

export const prepareCode = (code: string): Prepared => {
    const parsed = parseCode(code)
    const mutedNames = new Set<string>()

    if (!parsed) {
        return { code, mutedNames, sketch: { calls: [], texts: [] } }
    }

    const edits: Edits = new Map()
    bindNames(parsed.program, edits)

    visit(parsed.program, (node, ancestors) => {
        separate(code, parsed.tokens, node, edits)

        const named = readNamedLabel(node)

        if (!named) {
            return
        }

        const { argument, label } = named

        if (argument.raw?.startsWith('"') && !/['\\]/.test(label)) {
            edits.set(argument.start, "'")
            edits.set(argument.end - 1, "'")
        }

        if (ancestors.some((ancestor) => ancestor.type === 'LabeledStatement' && isMuted(ancestor.label.name))) {
            mutedNames.add(getBlockName(label))
        }
    })

    return { code: applyEdits(code, edits), mutedNames, sketch: readSketch(parsed.program) }
}
