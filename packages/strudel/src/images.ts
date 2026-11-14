import { camera, Image, imageMethodNames, picture, sourceFunctions, text, TextImage, textStyleNames, video } from '@lovechild/core'
import { isPattern, type Pattern } from '@strudel/core'
import { checkFunctions, checkMethods } from './warnings'

const readSource = (source: string | Pattern<string>) => isPattern(source) ? source.queryArc(0, 0)[0]?.value ?? '' : source

export const imageFunctions = checkFunctions({
    ...sourceFunctions,
    camera,
    video: (source: string | Pattern<string>) => video(readSource(source)),
    picture: (source: string | Pattern<string>) => picture(readSource(source)),
    text,
})

checkMethods(Image.prototype, imageMethodNames)

checkMethods(TextImage.prototype, textStyleNames)

const imageFunctionNames: ReadonlySet<string> = new Set([...Object.keys(imageFunctions), 'previous'])

export const isImageFunction = (name: string) => imageFunctionNames.has(name)
