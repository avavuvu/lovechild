import { parse, tokTypes, type AnyNode, type Program, type Token, type TokenType } from 'acorn'
import { isNode, visit } from './locations'

interface Opening {
    after: number
    type: TokenType
}

const lineBreak = /[\n\r\u2028\u2029]/

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

const readProgram = (code: string, tokens: Array<Token>): Program | undefined => {
    try {
        return parse(code, { ecmaVersion: 2022, allowAwaitOutsideFunction: true, onToken: tokens })
    } catch {
        return undefined
    }
}

const readTrackLabel = (node: AnyNode) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'track') {
        return undefined
    }

    const [argument] = node.arguments
    return argument?.type === 'Literal' && typeof argument.value === 'string' ? argument.value : undefined
}

export const findTrackBlocks = (code: string) => {
    const blocks = new Map<string, string | undefined>()
    const program = readProgram(code, [])

    const enter = (node: AnyNode, block: string | undefined) => {
        const inner = node.type === 'LabeledStatement' ? node.label.name : block
        const label = readTrackLabel(node)

        if (label !== undefined) {
            blocks.set(label, inner)
        }

        for (const value of Object.values(node)) {
            for (const child of Array.isArray(value) ? value : [value]) {
                if (isNode(child)) {
                    enter(child, inner)
                }
            }
        }
    }

    if (program) {
        enter(program, undefined)
    }

    return blocks
}

export const findBlockLabels = (code: string) => {
    const labels = new Map<string, Array<{ start: number, end: number }>>()
    const program = readProgram(code, [])

    if (program) {
        visit(program, (node) => {
            if (node.type === 'LabeledStatement') {
                const found = labels.get(node.label.name) ?? []
                found.push({ start: node.label.start, end: node.label.end })
                labels.set(node.label.name, found)
            }
        })
    }

    return labels
}

export const separateStatements = (code: string) => {
    const tokens: Array<Token> = []
    const program = readProgram(code, tokens)
    const breaks = new Set<number>()

    if (!program) {
        return code
    }

    visit(program, (node) => {
        const opening = readOpening(node)
        const position = opening && findBreak(code, tokens, opening)

        if (position !== undefined) {
            breaks.add(position)
        }
    })

    return Array.from(breaks).reduce((separated, position) => `${separated.slice(0, position)};${separated.slice(position + 1)}`, code)
}
