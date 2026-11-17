import { camera, picture, sourceFunctions, text, video } from '@lovechild/core'
import { isPattern, type Pattern } from '@strudel/core'
import { checkFunctions } from '../evaluation/warnings'

const readSource = (source: string | Pattern<string>) => isPattern(source) ? source.queryArc(0, 0)[0]?.value ?? '' : source

export const imageFunctions = checkFunctions({
    ...sourceFunctions,
    camera,
    video: (source: string | Pattern<string>) => video(readSource(source)),
    picture: (source: string | Pattern<string>) => picture(readSource(source)),
    text,
})

const imageFunctionNames: ReadonlySet<string> = new Set([...Object.keys(imageFunctions), 'previous'])

export const isImageFunction = (name: string) => imageFunctionNames.has(name)
