import type { AnyNode, CallExpression, Program } from 'acorn'
import { visit } from './syntax'
import type { Location } from './warnings'

interface Call {
    name: string
    given: number
    location: Location
}

interface Text {
    value: string
    callName: string | undefined
    location: Location
}

export type Search = { call: string, given: number } | { text: string, calls?: ReadonlySet<string> }

export interface Sketch {
    calls: ReadonlyArray<Call>
    texts: ReadonlyArray<Text>
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

const readCallName = (node: AnyNode, parent: AnyNode | undefined) => {
    if (parent?.type !== 'CallExpression' || !parent.arguments.some((argument) => argument === node)) {
        return undefined
    }

    return readCall(parent)?.name
}

export const readSketch = (program: Program): Sketch => {
    const calls: Array<Call> = []
    const texts: Array<Text> = []

    visit(program, (node, ancestors) => {
        const call = node.type === 'CallExpression' ? readCall(node) : undefined

        if (call) {
            calls.push(call)
        }

        if (node.type === 'Literal' && typeof node.value === 'string') {
            texts.push({ value: node.value, callName: readCallName(node, ancestors.at(-2)), location: { start: node.start, end: node.end } })
        }
    })

    return { calls, texts }
}

export const findLocations = (sketch: Sketch, search: Search): ReadonlyArray<Location> => {
    if ('call' in search) {
        return sketch.calls.filter((call) => call.name === search.call && call.given === search.given).map((call) => call.location)
    }

    const matches = sketch.texts.filter((text) => text.value === search.text)
    const { calls } = search
    const inCalls = calls ? matches.filter((text) => text.callName !== undefined && calls.has(text.callName)) : []
    return (inCalls.length > 0 ? inCalls : matches).map((text) => text.location)
}
