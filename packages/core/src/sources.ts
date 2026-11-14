import { Image, isImage } from './image'
import type { Amount, Paint, Parameter, SourceName } from './operation'
import { createArguments, definitions, sourceNames } from './steps'

const createSource = (name: SourceName, values: ReadonlyArray<Parameter | undefined>) => new Image({ kind: 'source', name, parameters: createArguments(name, values) })

export const osc = (frequency?: Amount, phase?: Amount) => createSource('osc', [frequency, phase])

export const shape = (sides?: Amount) => createSource('shape', [sides])

export const polygon = shape

export const paint = (color: Paint) => createSource('paint', [color, color, color, color])

export const solid = (red?: Paint, green?: Amount, blue?: Amount, alpha?: Amount) => {
    const isSingle = green === undefined && blue === undefined && alpha === undefined

    if (isSingle && red !== undefined && !isImage(red)) {
        return paint(red)
    }

    return createSource('solid', [red, green, blue, alpha])
}

export const color = solid

export const colour = solid

export const rgb = solid

export const xyz = solid

export const white = () => solid(1, 1, 1)

export const black = () => solid(0, 0, 0)

export const hsv = (hue?: Amount, saturation?: Amount, value?: Amount, alpha?: Amount) => createSource('hsv', [hue, saturation, value, alpha])

export const oklch = (lightness?: Amount, chroma?: Amount, hue?: Amount, alpha?: Amount) => createSource('oklch', [lightness, chroma, hue, alpha])

export const noise = (scale?: Amount, speed?: Amount) => createSource('noise', [scale, speed])

export const simplex = (scale?: Amount, phase?: Amount, offset?: Amount) => createSource('simplex', [scale, phase, offset])

export const voronoi = (scale?: Amount, speed?: Amount, blending?: Amount) => createSource('voronoi', [scale, speed, blending])

export const gradient = () => createSource('gradient', [])

export const pixels = (count?: Amount) => createSource('pixels', [count])

export const px = pixels

export const resolution = () => createSource('resolution', [])

export const sourceFunctions = { osc, shape, polygon, solid, color, colour, rgb, xyz, white, black, hsv, oklch, noise, simplex, voronoi, gradient, pixels, px, resolution }

for (const name of sourceNames) {
    if (!definitions[name].isInternal && !(name in sourceFunctions)) {
        throw new Error(`${name} has a definition but no function`)
    }
}

export const previous = (track?: string) => new Image({ kind: 'previous', track })

export const camera = () => new Image({ kind: 'media', name: 'camera', source: '' })

export const video = (source: string) => new Image({ kind: 'media', name: 'video', source })

export const picture = (source: string) => new Image({ kind: 'media', name: 'picture', source })
