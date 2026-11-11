import { generateGraph, type Graph } from '@lovechild/core'
import * as strudel from '@strudel/core'
import { isPattern, silence, stack, type Pattern } from '@strudel/core'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import './curves'
import './events'
import './selections'
import { evaluateCode } from './evaluate'
import { imageFunctions } from './images'
import { createInput, type Input } from './inputs'
import { createValueReader, getNamedChains, layerChains } from './visuals'

export type { Input, TriggerOptions } from './inputs'

export interface VisualsOptions {
    getTime: () => number
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

const toBlockName = (name: string) => name.startsWith('$') ? name : '$' + name

export const createVisuals = (options: VisualsOptions): Visuals => {
    const inputs = new Map<string, Pattern>()

    return {
        defineInput: (name, pattern) => {
            const created = createInput(options.getTime)
            inputs.set(toBlockName(name), pattern ? stack(pattern, created.pattern) : created.pattern)
            return created.input
        },
        compile: async (code) => {
            let cps: number | undefined

            const setCps = (value: number) => {
                cps = value
                return silence
            }

            const scope = {
                ...strudel,
                ...mini,
                ...tonal,
                ...imageFunctions,
                setcps: setCps,
                setcpm: (cpm: number) => setCps(cpm / 60),
            }

            const { blocks, names, transpiled } = await evaluateCode(code, scope, inputs)
            const graph = generateGraph(layerChains(blocks), [], getNamedChains(names))
            const reader = createValueReader(graph.uniforms)
            const sounds = blocks.filter(isPattern)

            return {
                graph,
                sound: sounds.length > 0 ? stack(...sounds) : silence,
                cps,
                transpiled,
                readValues: (time) => {
                    reader.updateValues(time)
                    return reader.values
                },
            }
        },
    }
}
