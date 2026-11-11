import { Chain, isChain } from './chain'
import type { Parameter, SourceName } from './operation'
import { createArguments } from './steps'

const createSource = (name: SourceName, values: ReadonlyArray<Parameter | undefined>) => new Chain({ kind: 'source', name, parameters: createArguments(name, values) })

export const osc = (frequency: Parameter = 10, phase: Parameter = 0) => createSource('osc', [frequency, phase])

export const shape = (sides: Parameter = 3) => createSource('shape', [sides])

export const polygon = shape

export const paint = (color: Parameter) => createSource('paint', [color, color, color, color])

export const solid = (red?: Parameter, green?: Parameter, blue?: Parameter, alpha?: Parameter) => {
    const isSingle = green === undefined && blue === undefined && alpha === undefined

    if (isSingle && red !== undefined && !isChain(red)) {
        return paint(red)
    }

    return createSource('solid', [red, green, blue, alpha])
}

export const white = () => solid(1, 1, 1)

export const black = () => solid(0, 0, 0)

export const hsv = (hue: Parameter = 0, saturation: Parameter = 1, value: Parameter = 1, alpha: Parameter = 1) => createSource('hsv', [hue, saturation, value, alpha])

export const oklch = (lightness: Parameter = 0.7, chroma: Parameter = 0.5, hue: Parameter = 0, alpha: Parameter = 1) => createSource('oklch', [lightness, chroma, hue, alpha])

export const noise = (scale: Parameter = 10, speed: Parameter = 0.2) => createSource('noise', [scale, speed])

export const simplex = (scale: Parameter = 10, phase: Parameter = 0, offset: Parameter = 0) => createSource('simplex', [scale, phase, offset])

export const voronoi = (scale: Parameter = 5, speed: Parameter = 0.1, blending: Parameter = 0.3) => createSource('voronoi', [scale, speed, blending])

export const gradient = () => createSource('gradient', [])

export const previous = (block?: string) => new Chain({ kind: 'previous', block })

export const camera = () => new Chain({ kind: 'media', name: 'camera', source: '' })

export const video = (source: string) => new Chain({ kind: 'media', name: 'video', source })

export const image = (source: string) => new Chain({ kind: 'media', name: 'image', source })
