import { parse, tokTypes, type AnyNode, type Comment, type Program, type Token } from 'acorn'
import { separateStatements } from './statements'

interface Item {
    start: number
    end: number
    text: string
    isComment: boolean
}

interface Link {
    name: string
    values: ReadonlyArray<AnyNode> | undefined
    objectEnd: number
    propertyStart: number
    valuesStart: number
    end: number
}

interface Parsed {
    program: Program
    tokens: ReadonlyArray<Token>
    comments: ReadonlyArray<Comment>
    source: string
}

const lineWidth = 100

const indentation = '  '

const isMultiline = (text: string) => text.includes('\n')

const pad = (depth: number) => indentation.repeat(depth)

const readFirstLine = (text: string) => text.split('\n')[0]

const readLastLine = (text: string) => text.split('\n').at(-1) ?? ''

const countLineBreaks = (text: string) => text.split('\n').length - 1

const isNumber = (node: AnyNode | null) => node?.type === 'Literal' && typeof node.value === 'number'

const readCode = (code: string): Parsed | undefined => {
    const source = separateStatements(code)
    const tokens: Array<Token> = []
    const comments: Array<Comment> = []

    try {
        const program = parse(source, { ecmaVersion: 2022, allowAwaitOutsideFunction: true, preserveParens: true, onToken: tokens, onComment: comments })
        return { program, tokens, comments, source }
    } catch {
        return undefined
    }
}

const describeCode = ({ program, tokens, comments, source }: Parsed) => JSON.stringify([
    program.body.length,
    tokens.filter((token) => token.type !== tokTypes.semi && token.type !== tokTypes.eof).map((token) => token.type === tokTypes.num ? String(Number(source.slice(token.start, token.end))) : source.slice(token.start, token.end)),
    comments.map((comment) => comment.value),
])

const layOut = (code: string, { program, tokens, comments, source }: Parsed) => {
    const zeroPositions = new Set(tokens.filter((token) => token.type === tokTypes.num && source[token.start] === '.').map((token) => token.start))

    const readSource = (start: number, end: number) => {
        let text = ''

        for (let index = start; index < end; index += 1) {
            text += zeroPositions.has(index) ? '0' + source[index] : source[index]
        }

        return text
    }

    const findComments = (from: number, to: number) => comments.filter((comment) => comment.start >= from && comment.end <= to)

    const readComment = (comment: Comment) => source.slice(comment.start, comment.end)

    const isTrailing = (from: number, comment: Comment) => !source.slice(from, comment.start).includes('\n')

    const readLinks = (node: AnyNode) => {
        const links: Array<Link> = []
        let base = node

        for (;;) {
            if (base.type === 'CallExpression' && !base.optional && base.callee.type === 'MemberExpression' && !base.callee.computed && !base.callee.optional && base.callee.property.type === 'Identifier') {
                const { object, property } = base.callee
                links.unshift({ name: property.name, values: base.arguments, objectEnd: object.end, propertyStart: property.start, valuesStart: base.callee.end, end: base.end })
                base = object
            } else if (base.type === 'MemberExpression' && !base.computed && !base.optional && base.property.type === 'Identifier') {
                links.unshift({ name: base.property.name, values: undefined, objectEnd: base.object.end, propertyStart: base.property.start, valuesStart: base.end, end: base.end })
                base = base.object
            } else {
                return { base, links }
            }
        }
    }

    const formatCommentedList = (open: string, items: ReadonlyArray<AnyNode>, close: string, depth: number, start: number, end: number) => {
        const lines: Array<string> = []
        let previousEnd: number | undefined

        const addComments = (from: number, to: number) => {
            for (const comment of findComments(from, to)) {
                if (previousEnd !== undefined && lines.length > 0 && isTrailing(previousEnd, comment)) {
                    lines[lines.length - 1] += ' ' + readComment(comment)
                } else {
                    lines.push(pad(depth + 1) + readComment(comment))
                }
            }
        }

        for (const [index, item] of items.entries()) {
            addComments(previousEnd ?? start, item.start)
            lines.push(pad(depth + 1) + formatNode(item, depth + 1, false) + (index < items.length - 1 ? ',' : ''))
            previousEnd = item.end
        }

        addComments(previousEnd ?? start, end)
        return open + '\n' + lines.join('\n') + '\n' + pad(depth) + close
    }

    const formatList = (open: string, items: ReadonlyArray<AnyNode | null>, close: string, depth: number, start: number, end: number, isSpread = false): string => {
        const present = items.filter((item) => item !== null)

        if (present.length === items.length && findComments(start, end).some((comment) => !present.some((item) => comment.start >= item.start && comment.end <= item.end))) {
            return formatCommentedList(open, present, close, depth, start, end)
        }

        const [only] = items

        if (items.length === 1 && only) {
            const hugged = formatNode(only, depth, false)

            if (isMultiline(hugged) && /^\s*[\])]/.test(readLastLine(hugged))) {
                return open + hugged + close
            }
        }

        const texts = items.map((item) => item === null ? '' : formatNode(item, depth + 1, false))
        const inline = open + texts.join(', ') + close

        if (!isSpread && !texts.some(isMultiline) && pad(depth).length + inline.length <= lineWidth) {
            return inline
        }

        return open + '\n' + texts.map((text) => pad(depth + 1) + text).join(',\n') + '\n' + pad(depth) + close
    }

    const formatLeaf = (node: AnyNode, depth: number): string => {
        if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') {
            const head = readSource(node.start, node.body.start).trimEnd()
            return head.endsWith('=>') ? head + ' ' + formatNode(node.body, depth, true) : readSource(node.start, node.end)
        }

        if (node.type === 'ArrayExpression') {
            return formatList('[', node.elements, ']', depth, node.start, node.end, node.elements.length >= 2 && !node.elements.every(isNumber))
        }

        if (node.type === 'CallExpression' && !node.optional && node.callee.type === 'Identifier') {
            return node.callee.name + formatList('(', node.arguments, ')', depth, node.callee.end, node.end)
        }

        return readSource(node.start, node.end)
    }

    const formatChain = (node: AnyNode, depth: number, isCallback: boolean) => {
        const { base, links } = readLinks(node)
        const baseText = formatLeaf(base, depth)
        const calls = links.filter((link) => link.values !== undefined).length
        const linkComments = links.map((link) => findComments(link.objectEnd, link.propertyStart))
        const hasComments = linkComments.some((found) => found.length > 0)

        const formatLink = (link: Link, linkDepth: number) => '.' + link.name + (link.values === undefined ? '' : formatList('(', link.values, ')', linkDepth, link.valuesStart, link.end))

        const inline = baseText + links.map((link) => formatLink(link, depth)).join('')
        const shouldBreak = hasComments || (!isCallback && calls >= 2)

        if (!hasComments && (calls === 0 || (!shouldBreak && pad(depth).length + readFirstLine(inline).length <= lineWidth))) {
            return inline
        }

        return links.reduce((text, link, index) => {
            const found = linkComments[index]
            const withComments = found.reduce((commented, comment) => commented + (isTrailing(link.objectEnd, comment) ? ' ' : '\n' + pad(depth + 1)) + readComment(comment), text)
            const isOwnLine = link.values !== undefined || found.length > 0
            return withComments + (isOwnLine ? '\n' + pad(depth + 1) : '') + formatLink(link, depth + 1)
        }, baseText)
    }

    const formatNode = (node: AnyNode, depth: number, isCallback: boolean): string => {
        if (node.type === 'CallExpression' || node.type === 'MemberExpression') {
            return formatChain(node, depth, isCallback)
        }

        return formatLeaf(node, depth)
    }

    const formatParts = (statement: AnyNode) => {
        if (statement.type === 'ExpressionStatement') {
            return formatNode(statement.expression, 0, false)
        }

        if (statement.type === 'LabeledStatement' && statement.body.type === 'ExpressionStatement') {
            return statement.label.name + ': ' + formatNode(statement.body.expression, 0, false)
        }

        if (statement.type === 'VariableDeclaration') {
            const declarations = statement.declarations.map((declaration) => readSource(declaration.id.start, declaration.id.end) + (declaration.init ? ' = ' + formatNode(declaration.init, 0, false) : ''))
            return statement.kind + ' ' + declarations.join(', ')
        }

        return undefined
    }

    const keepsComments = (statement: AnyNode, text: string) => {
        let from = 0

        for (const comment of findComments(statement.start, statement.end)) {
            const found = text.indexOf(readComment(comment), from)

            if (found === -1) {
                return false
            }

            from = found + comment.end - comment.start
        }

        return true
    }

    const formatStatement = (statement: AnyNode) => {
        const formatted = formatParts(statement)
        return formatted !== undefined && keepsComments(statement, formatted) ? formatted : readSource(statement.start, statement.end).replace(/;$/, '')
    }

    const isTopLevel = (comment: Comment) => !program.body.some((statement) => comment.start >= statement.start && comment.end <= statement.end)

    const readColumn = (position: number) => position - code.lastIndexOf('\n', position - 1) - 1

    const items: Array<Item> = [
        ...program.body.map((statement) => ({ start: statement.start, end: statement.end, text: formatStatement(statement), isComment: false })),
        ...comments.filter(isTopLevel).map((comment) => ({ start: comment.start, end: comment.end, text: readComment(comment), isComment: true })),
    ].sort((first, second) => first.start - second.start)

    if (items.length === 0) {
        return code
    }

    return items.reduce((output, item, index) => {
        if (index === 0) {
            return item.text
        }

        const previous = items[index - 1]
        const isSeparatorAdded = source[previous.end - 1] !== code[previous.end - 1]
        const lineBreaks = countLineBreaks(code.slice(isSeparatorAdded ? previous.end - 1 : previous.end, item.start))

        if (lineBreaks === 0 && item.isComment) {
            return output + ' ' + item.text
        }

        if (lineBreaks === 1 && item.isComment && readColumn(item.start) > 0) {
            return output + '\n' + pad(1) + item.text
        }

        const isSpread = !previous.isComment && !item.isComment && (isMultiline(previous.text) || isMultiline(item.text))
        return output + (lineBreaks >= 2 || isSpread ? '\n\n' : '\n') + item.text
    }, '') + '\n'
}

export const formatCode = (code: string): string | undefined => {
    const parsed = readCode(code)

    if (!parsed) {
        return undefined
    }

    const formatted = layOut(code, parsed)
    const check = readCode(formatted)
    return check && describeCode(check) === describeCode(parsed) ? formatted : undefined
}
