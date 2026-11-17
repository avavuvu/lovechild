import { generateGraph, isImage, type Graph } from '@lovechild/core'
import * as strudel from '@strudel/core'
import { isPattern, silence, stack, type Pattern } from '@strudel/core'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import { evaluateCode, type EvaluatedScene } from './evaluate'
import { imageFunctions } from '../language/images'
import { getImagesByName, type ImageOrPattern } from './names'
import { patternFunctions } from '../language/patterns'
import { createWarningList, type Warning, type WarningList } from './warnings'
import { installPrototypes } from '../prototypes'

installPrototypes()

export interface CompileOptions {
    setCps: (cps: number) => void
    libraries?: ReadonlyArray<object>
    scope?: Record<string, unknown>
    inputs?: ReadonlyMap<string, ImageOrPattern>
    onWarning?: (warning: Warning) => void
}

export interface Compiled {
    evaluation: EvaluatedScene
    graph: Graph | undefined
    sound: Pattern
    warnings: WarningList
}

const createScope = ({ setCps, libraries = [], scope }: CompileOptions) => {
    const setTempo = (cps: number) => {
        setCps(cps)
        return silence
    }

    return {
        ...strudel,
        ...Object.assign({}, ...libraries),
        ...mini,
        ...tonal,
        ...imageFunctions,
        ...patternFunctions,
        ...scope,
        setcps: setTempo,
        setcpm: (cpm: number) => setTempo(cpm / 60),
    }
}

const layerImages = (onStage: ReadonlyArray<ImageOrPattern>) => {
    const images = onStage.filter(isImage)
    return images.length > 0 ? images.reduce((layered, next) => layered.layer(next)) : undefined
}

const createGraph = ({ onStage, imagePreviews, imagesAndPatternsByName }: EvaluatedScene) => {
    const image = layerImages(onStage)

    if (image === undefined && imagePreviews.length === 0) {
        return undefined
    }

    return generateGraph(image, imagePreviews.map((preview) => preview.image), getImagesByName(imagesAndPatternsByName))
}

export const compileCode = async (code: string, options: CompileOptions): Promise<Compiled> => {
    const evaluation = await evaluateCode(code, createScope(options), options.inputs)
    const warnings = createWarningList(evaluation.sketch, options.onWarning)
    const sounds = evaluation.onStage.filter(isPattern)

    for (const { details, place } of evaluation.reports) {
        warnings.add(details, place)
    }

    return {
        evaluation,
        graph: createGraph(evaluation),
        sound: sounds.length > 0 ? stack(...sounds) : silence,
        warnings,
    }
}
