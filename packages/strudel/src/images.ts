import { black, camera, gradient, hsv, image, noise, oklch, osc, polygon, shape, simplex, solid, text, video, voronoi, white } from '@lovechild/core'
import { isPattern, type Pattern } from '@strudel/core'

const readSource = (source: string | Pattern<string>) => isPattern(source) ? source.queryArc(0, 0)[0]?.value ?? '' : source

export const imageFunctions = {
    osc,
    shape,
    polygon,
    solid,
    color: solid,
    colour: solid,
    rgb: solid,
    xyz: solid,
    white,
    black,
    hsv,
    oklch,
    noise,
    simplex,
    voronoi,
    gradient,
    camera,
    video: (source: string | Pattern<string>) => video(readSource(source)),
    image: (source: string | Pattern<string>) => image(readSource(source)),
    text,
}

export const imageFunctionNames: ReadonlyArray<string> = [...Object.keys(imageFunctions), 'previous']
