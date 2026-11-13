import { generateGraph, type Graph } from '@lovechild/core'
import * as strudel from '@strudel/core'
import { isPattern, silence, stack, type Pattern } from '@strudel/core'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import './curves'
import './events'
import './sounds'
import './selections'
import { evaluateCode } from './evaluate'
import { imageFunctions } from './images'
import { createInput, type Input } from './inputs'
import { createValueReader, getNamedImages, layerImages } from './visuals'
import { createWarningList, type Warning } from './warnings'

export type { Input, TriggerOptions } from './inputs'
export type { Location, Warning } from './warnings'

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

const toTrackName = (name: string) => name.startsWith('$') ? name : '$' + name

export const createVisuals = (options: VisualsOptions): Visuals => {
    const inputs = new Map<string, Pattern>()

    return {
        defineInput: (name, pattern) => {
            const created = createInput(options.getTime)
            inputs.set(toTrackName(name), pattern ? stack(pattern, created.pattern) : created.pattern)
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

            const { tracks, names, transpiled, reports } = await evaluateCode(code, scope, inputs)
            const warnings = createWarningList(code, options.onWarning)

            for (const { details, place } of reports) {
                warnings.add(details, place)
            }

            const graph = generateGraph(layerImages(tracks), [], getNamedImages(names))
            const reader = createValueReader(graph.uniforms, warnings)
            const sounds = tracks.filter(isPattern)

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
