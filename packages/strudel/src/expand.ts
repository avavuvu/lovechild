import { mini2ast, type MiniElement, type MiniNode, type MiniOperation, type MiniPattern } from '@strudel/mini'
import { transpiler } from '@strudel/transpiler'

type Printed =
    | { kind: 'value', code: string, number?: number }
    | { kind: 'list', values: ReadonlyArray<string> }
    | { kind: 'pattern', code: string }

interface Item {
    weight: number
    printed: Printed
}

const randomOffset = 0.0003

const quote = (text: string) => "'" + text.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

const toPattern = (code: string): Printed => ({ kind: 'pattern', code })

const printArgument = (printed: Printed) => {
    if (printed.kind === 'list') {
        return `pure([${printed.values.join(', ')}])`
    }

    return printed.code
}

const printReceiver = (printed: Printed) => printed.kind === 'value' ? `pure(${printed.code})` : printArgument(printed)

const printCall = (name: string, values: ReadonlyArray<Printed>) => `${name}(${values.map(printArgument).join(', ')})`

const printAtom = (source: string): Printed => {
    if (source === '~' || source === '-') {
        return toPattern('silence')
    }

    const number = Number(source)

    if (!isNaN(number)) {
        return { kind: 'value', code: String(number), number }
    }

    return { kind: 'value', code: quote(source) }
}

const getRange = (start: number, stop: number) => Array.from({ length: Math.abs(stop - start) + 1 }, (_value, index) => start < stop ? start + index : start - index)

const applyOperation = (printed: Printed, operation: MiniOperation): Printed => {
    const receiver = printReceiver(printed)

    switch (operation.type_) {
        case 'stretch': {
            return toPattern(`${receiver}.${operation.arguments_.type}(${printArgument(printNode(operation.arguments_.amount))})`)
        }
        case 'replicate': {
            const { amount } = operation.arguments_
            return toPattern(`${receiver}.repeatCycles(${amount}).fast(${amount})`)
        }
        case 'bjorklund': {
            const { pulse, step, rotation } = operation.arguments_
            const values = [pulse, step, ...(rotation ? [rotation] : [])].map(printNode)
            return toPattern(`${receiver}.${printCall(rotation ? 'euclidRot' : 'euclid', values)}`)
        }
        case 'degradeBy': {
            const { amount, seed } = operation.arguments_

            if (seed === 0) {
                return toPattern(`${receiver}.degradeBy(${amount ?? 0.5})`)
            }

            return toPattern(`${receiver}._degradeByWith(rand.early(${randomOffset} * ${seed}), ${amount ?? 0.5})`)
        }
        case 'tail': {
            const friend = printNode(operation.arguments_.element)

            if (printed.kind !== 'pattern' && friend.kind === 'value') {
                const values = printed.kind === 'list' ? printed.values : [printed.code]
                return { kind: 'list', values: [...values, friend.code] }
            }

            return toPattern(`${receiver}.fmap((a) => (b) => (Array.isArray(a) ? [...a, b] : [a, b])).appLeft(${printReceiver(friend)})`)
        }
        case 'range': {
            const friend = printNode(operation.arguments_.element)

            if (printed.kind === 'value' && friend.kind === 'value' && printed.number !== undefined && friend.number !== undefined) {
                return toPattern(printCall('seq', getRange(printed.number, friend.number).map((number) => printAtom(String(number)))))
            }

            throw new Error('mini range needs numbers')
        }
        default: {
            throw new Error('unknown mini operation')
        }
    }
}

const getElementItems = (element: MiniElement): Array<Item> => {
    const { ops, weight } = element.options_
    const source = printNode(element.source_)
    const last = ops.at(-1)

    if (last?.type_ === 'replicate') {
        const { amount } = last.arguments_
        const printed = ops.slice(0, -1).reduce(applyOperation, source)
        return Array.from({ length: amount }, () => ({ weight: weight / amount, printed }))
    }

    return [{ weight, printed: ops.reduce(applyOperation, source) }]
}

const getItems = (pattern: MiniPattern) => pattern.source_.flatMap((child) => child.type_ === 'element' ? getElementItems(child) : [{ weight: 1, printed: printNode(child) }])

const getTotalWeight = (items: ReadonlyArray<Item>) => items.reduce((total, item) => total + item.weight, 0)

const isEvenlyWeighted = (items: ReadonlyArray<Item>) => items.every((item) => item.weight === 1)

const printItems = (items: ReadonlyArray<Item>): Printed => {
    if (items.length === 1) {
        return items[0].printed
    }

    if (isEvenlyWeighted(items)) {
        return toPattern(printCall('seq', items.map((item) => item.printed)))
    }

    return toPattern(`timeCat(${items.map((item) => `[${item.weight}, ${printArgument(item.printed)}]`).join(', ')})`)
}

const getSequenceItems = (node: MiniNode) => {
    if (node.type_ !== 'pattern' || node.arguments_.alignment !== 'fastcat') {
        throw new Error('mini sequence expected')
    }

    return getItems(node)
}

const printSlowcat = (node: MiniNode): Printed => {
    const items = getSequenceItems(node)

    if (isEvenlyWeighted(items)) {
        return items.length === 1 ? items[0].printed : toPattern(printCall('cat', items.map((item) => item.printed)))
    }

    return toPattern(`${printReceiver(printItems(items))}.slow(${getTotalWeight(items)})`)
}

const printRatio = (steps: Printed, total: number) => {
    if (steps.kind === 'value' && steps.number !== undefined) {
        return steps.number % total === 0 ? String(steps.number / total) : `${steps.number} / ${total}`
    }

    return `${printReceiver(steps)}.div(${total})`
}

const printPolymeter = (pattern: MiniPattern): Printed => {
    const sequences = pattern.source_.map(getSequenceItems)
    const steps = pattern.arguments_.stepsPerCycle ? printNode(pattern.arguments_.stepsPerCycle) : printAtom(String(getTotalWeight(sequences[0] ?? [])))

    const aligned = sequences.map((items) => {
        const ratio = printRatio(steps, getTotalWeight(items))
        const printed = printItems(items)
        return ratio === '1' ? printed : toPattern(`${printReceiver(printed)}.fast(${ratio})`)
    })

    return toPattern(printCall('stack', aligned))
}

const printPattern = (pattern: MiniPattern): Printed => {
    const { alignment, seed } = pattern.arguments_

    switch (alignment) {
        case 'stack': {
            return toPattern(printCall('stack', pattern.source_.map(printNode)))
        }
        case 'polymeter_slowcat': {
            const children = pattern.source_.map(printSlowcat)
            return children.length === 1 ? children[0] : toPattern(printCall('stack', children))
        }
        case 'polymeter': {
            return printPolymeter(pattern)
        }
        case 'rand': {
            const children = pattern.source_.map(printNode)

            if (!seed) {
                return toPattern(printCall('randcat', children))
            }

            return toPattern(`chooseInWith(rand.early(${randomOffset} * ${seed}).segment(1), [${children.map(printArgument).join(', ')}])`)
        }
        case 'feet': {
            return toPattern(printCall('seq', pattern.source_.map(printNode)))
        }
        default: {
            return printItems(getItems(pattern))
        }
    }
}

const printNode = (node: MiniNode): Printed => {
    switch (node.type_) {
        case 'atom': {
            return printAtom(node.source_)
        }
        case 'element': {
            return node.options_.ops.reduce(applyOperation, printNode(node.source_))
        }
        case 'pattern': {
            return printPattern(node)
        }
        case 'stretch': {
            return toPattern(`${printReceiver(printNode(node.source_))}.slow(${printArgument(printNode(node.arguments_.amount))})`)
        }
    }
}

export const printMiniNotation = (text: string) => printArgument(printNode(mini2ast(`"${text}"`)))

const findStringEnd = (code: string, start: number) => {
    const quote = code[start]
    let index = start + 1

    while (index < code.length && code[index] !== quote) {
        index += code[index] === '\\' ? 2 : 1
    }

    return index
}

const readStringValue = (raw: string, quote: string) => {
    if (quote === '`') {
        return raw
    }

    try {
        return JSON.parse(`"${raw}"`) as string
    } catch {
        return raw
    }
}

const expandString = (code: string, start: number) => {
    const quote = code[start]

    if (quote !== '"' && quote !== '`') {
        return code
    }

    const end = findStringEnd(code, start)
    const raw = code.slice(start + 1, end)

    if (quote === '`' && raw.includes('${')) {
        return code
    }

    try {
        return code.slice(0, start) + printMiniNotation(readStringValue(raw, quote)) + code.slice(end + 1)
    } catch {
        return code
    }
}

export const expandMiniNotation = (code: string) => {
    const { output } = transpiler(code, { wrapAsync: true })
    const starts = Array.from(output.matchAll(/\bm\('(?:[^'\\]|\\.)*', (\d+)\)/g), (match) => Number(match[1]))
    return starts.sort((first, second) => second - first).reduce(expandString, code)
}
