import type { Image } from '@lovechild/core'
import type { Pattern } from '@strudel/core'
import { transpiler, type Widget } from '@strudel/transpiler'
import type { Sketch } from './locations'
import type { ImageOrPattern } from './names'
import { prepareCode } from './prepare'
import { createSceneBuilder, type SceneBuilder, type Scene } from './scene'
import { collectWarnings, type Report } from './warnings'

export type { ImagePreview, PatternPreview } from './scene'

export type MiniLocation = [number, number]

export interface EvaluatedScene extends Scene {
    miniLocations: ReadonlyArray<MiniLocation>
    widgets: ReadonlyArray<Widget>
    transpiled: string
    reports: ReadonlyArray<Report>
    sketch: Sketch
}

let currentScene: SceneBuilder | undefined

let queue: Promise<unknown> = Promise.resolve()

const runAlone = <Result>(run: () => Promise<Result>) => {
    const result = queue.then(run)
    queue = result.catch(() => undefined)
    return result
}

export const blockMethod = function (this: ImageOrPattern, label: string) {
    return currentScene ? currentScene.addBlock(label, this) : this
}

export const nameMethod = function (this: ImageOrPattern, label: unknown) {
    return currentScene ? currentScene.giveNameToImageOrPattern(label, this) : this
}

export const imagePreviewMethod = function (this: Image, id: string) {
    currentScene?.addImagePreview(id, this)
    return this
}

export const patternPreviewMethod = function (this: Pattern, id: string) {
    currentScene?.addPatternPreview(id, this)
    return this
}

export const evaluateCode = (code: string, scope: Record<string, unknown>, inputs: ReadonlyMap<string, ImageOrPattern> = new Map()) => runAlone(async (): Promise<EvaluatedScene> => {
    const prepared = prepareCode(code)
    const { output, miniLocations = [], widgets = [] } = transpiler(prepared.code, { wrapAsync: true })
    const current = createSceneBuilder(prepared, inputs)
    const values = { ...scope, previous: current.readPrevious }
    const execute = new Function('lookup', ...Object.keys(values), 'with (lookup) { return ' + output + ' }')
    currentScene = current

    try {
        const { result, reports } = await collectWarnings(async () => current.build(await execute(current.lookup, ...Object.values(values))))
        return { ...result, miniLocations, widgets, transpiled: output, reports, sketch: prepared.sketch }
    } finally {
        currentScene = undefined
    }
})
