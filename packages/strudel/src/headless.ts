import { generateGraph, type Graph } from '@lovechild/core'
import { stack, type Pattern } from '@strudel/core'
import { compileCode } from './evaluation/compile'
import { createInput, type Input } from './playback/inputs'
import { createValueReader } from './playback/values'
import type { Warning } from './evaluation/warnings'

export type { Input, TriggerOptions } from './playback/inputs'
export type { Location, Warning } from './evaluation/warnings'

export interface VisualsOptions {
    getTime: () => number
    onWarning?: (warning: Warning) => void
}

export interface CompiledVisual {
    graph: Graph
    sound: Pattern
    cps: number | undefined
    transpiled: string
    readValues: (time: number) => ReadonlyArray<number>
}

export interface Visuals {
    defineInput: (name: string, pattern?: Pattern) => Input
    compile: (code: string) => Promise<CompiledVisual>
}

const toName = (name: string) => name.startsWith('$') ? name : '$' + name

export const createVisuals = (options: VisualsOptions): Visuals => {
    const inputs = new Map<string, Pattern>()

    return {
        defineInput: (name, pattern) => {
            const created = createInput(options.getTime)
            inputs.set(toName(name), pattern ? stack(pattern, created.pattern) : created.pattern)
            return created.input
        },
        compile: async (code) => {
            let cps: number | undefined

            const { evaluation, graph = generateGraph(undefined, [], new Map()), sound, warnings } = await compileCode(code, {
                setCps: (value) => {
                    cps = value
                },
                inputs,
                onWarning: options.onWarning,
            })

            const reader = createValueReader(graph.uniforms, warnings)

            return {
                graph,
                sound,
                cps,
                transpiled: evaluation.transpiled,
                readValues: (time) => {
                    reader.updateValues(time)
                    return reader.values
                },
            }
        },
    }
}
