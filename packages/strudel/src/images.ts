import { camera, gradient, image, noise, osc, polygon, shape, solid, video, voronoi } from '@lovechild/core'
import { isPattern, type Pattern } from '@strudel/core'

const readSource = (source: string | Pattern<string>) => isPattern(source) ? source.queryArc(0, 0)[0]?.value ?? '' : source

export const imageFunctions = {
    osc,
    shape,
    polygon,
    solid,
    noise,
    voronoi,
    gradient,
    camera,
    video: (source: string | Pattern<string>) => video(readSource(source)),
    image: (source: string | Pattern<string>) => image(readSource(source)),
}

export const imageFunctionNames: ReadonlyArray<string> = [...Object.keys(imageFunctions), 'previous']
