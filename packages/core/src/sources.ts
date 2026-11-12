import { Image, isImage } from './image'
import type { Parameter, SourceName } from './operation'
import { createArguments, definitions, sourceNames } from './steps'

const createSource = (name: SourceName, values: ReadonlyArray<Parameter | undefined>) => new Image({ kind: 'source', name, parameters: createArguments(name, values) })

export const osc = (frequency?: Parameter, phase?: Parameter) => createSource('osc', [frequency, phase])

export const shape = (sides?: Parameter) => createSource('shape', [sides])

export const polygon = shape

export const paint = (color: Parameter) => createSource('paint', [color, color, color, color])

export const solid = (red?: Parameter, green?: Parameter, blue?: Parameter, alpha?: Parameter) => {
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

export const hsv = (hue?: Parameter, saturation?: Parameter, value?: Parameter, alpha?: Parameter) => createSource('hsv', [hue, saturation, value, alpha])

export const oklch = (lightness?: Parameter, chroma?: Parameter, hue?: Parameter, alpha?: Parameter) => createSource('oklch', [lightness, chroma, hue, alpha])

export const noise = (scale?: Parameter, speed?: Parameter) => createSource('noise', [scale, speed])

export const simplex = (scale?: Parameter, phase?: Parameter, offset?: Parameter) => createSource('simplex', [scale, phase, offset])

export const voronoi = (scale?: Parameter, speed?: Parameter, blending?: Parameter) => createSource('voronoi', [scale, speed, blending])

export const gradient = () => createSource('gradient', [])

export const sourceFunctions = { osc, shape, polygon, solid, color, colour, rgb, xyz, white, black, hsv, oklch, noise, simplex, voronoi, gradient }

for (const name of sourceNames) {
    if (!definitions[name].isInternal && !(name in sourceFunctions)) {
        throw new Error(`${name} has a definition but no function`)
    }
}

export const previous = (block?: string) => new Image({ kind: 'previous', block })

export const camera = () => new Image({ kind: 'media', name: 'camera', source: '' })

export const video = (source: string) => new Image({ kind: 'media', name: 'video', source })

export const image = (source: string) => new Image({ kind: 'media', name: 'image', source })
