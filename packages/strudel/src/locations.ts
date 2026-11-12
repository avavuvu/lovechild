import { parse, type AnyNode, type CallExpression } from 'acorn'
import type { Location } from './warnings'

interface Call {
    name: string
    given: number
    location: Location
}

interface Text {
    value: string
    location: Location
}

export type Search = { call: string, given: number } | { text: string }

export interface Sketch {
    calls: ReadonlyArray<Call>
    texts: ReadonlyArray<Text>
}

const isNode = (value: unknown): value is AnyNode => typeof value === 'object' && value !== null && 'type' in value

export const visit = (node: AnyNode, enter: (node: AnyNode) => void) => {
    enter(node)

    for (const value of Object.values(node)) {
        for (const child of Array.isArray(value) ? value : [value]) {
            if (isNode(child)) {
                visit(child, enter)
            }
        }
    }
}

const readCall = (node: CallExpression): Call | undefined => {
    const { callee } = node
    const given = node.arguments.length

    if (node.arguments.some((argument) => argument.type === 'SpreadElement')) {
        return undefined
    }

    if (callee.type === 'Identifier') {
        return { name: callee.name, given, location: { start: callee.start, end: node.end } }
    }

    if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
        return { name: callee.property.name, given, location: { start: callee.property.start, end: node.end } }
    }

    return undefined
}

export const readSketch = (code: string): Sketch => {
    const calls: Array<Call> = []
    const texts: Array<Text> = []

    try {
        visit(parse(code, { ecmaVersion: 2022, allowAwaitOutsideFunction: true }), (node) => {
            const call = node.type === 'CallExpression' ? readCall(node) : undefined

            if (call) {
                calls.push(call)
            }

            if (node.type === 'Literal' && typeof node.value === 'string') {
                texts.push({ value: node.value, location: { start: node.start, end: node.end } })
            }
        })
    } catch {
        return { calls: [], texts: [] }
    }

    return { calls, texts }
}

export const findLocations = (sketch: Sketch, search: Search): ReadonlyArray<Location> => {
    if ('call' in search) {
        return sketch.calls.filter((call) => call.name === search.call && call.given === search.given).map((call) => call.location)
    }

    return sketch.texts.filter((text) => text.value === search.text).map((text) => text.location)
}
