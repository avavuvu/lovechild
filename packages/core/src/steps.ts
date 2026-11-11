import type { Argument, ColorName, CombineName, CoordinateName, OperationName, Parameter, SourceName, SplitName } from './operation'

export type Shape = 'scalar' | 'xy' | 'rgb' | 'rgba'

export type StepKind = 'source' | 'coordinate' | 'color' | 'combine' | 'split'

const sourceShapes: Record<SourceName, ReadonlyArray<Shape>> = {
    osc: ['scalar', 'scalar'],
    shape: ['scalar'],
    solid: ['rgba'],
    noise: ['scalar', 'scalar'],
    simplex: ['scalar', 'scalar', 'scalar'],
    voronoi: ['scalar', 'scalar', 'scalar'],
    gradient: [],
    empty: [],
    paint: ['scalar', 'scalar', 'scalar', 'scalar'],
    hsv: ['scalar', 'scalar', 'scalar', 'scalar'],
    oklch: ['scalar', 'scalar', 'scalar', 'scalar'],
}

const coordinateShapes: Record<CoordinateName, ReadonlyArray<Shape>> = {
    rotate: ['scalar'],
    scale: ['xy'],
    move: ['xy'],
    kaleid: ['scalar'],
    pixelate: ['xy'],
    repeat: ['xy'],
}

const colorShapes: Record<ColorName, ReadonlyArray<Shape>> = {
    invert: ['scalar'],
    channels: ['scalar'],
    range: ['scalar', 'scalar'],
    brightness: ['scalar'],
    contrast: ['scalar'],
    saturate: ['scalar'],
    hue: ['scalar'],
    colorama: ['scalar'],
    shift: ['rgb'],
    grey: [],
    posterize: ['scalar'],
    thresh: ['scalar'],
    luma: ['scalar'],
}

const combineShapes: Record<CombineName, ReadonlyArray<Shape>> = {
    add: [],
    sub: [],
    mult: [],
    diff: [],
    layer: [],
    mask: [],
    blend: ['scalar'],
    screen: [],
}

const splitShapes: Record<SplitName, ReadonlyArray<Shape>> = {
    split: ['xy'],
}

const groups: ReadonlyArray<[StepKind, Partial<Record<OperationName, ReadonlyArray<Shape>>>]> = [
    ['source', sourceShapes],
    ['coordinate', coordinateShapes],
    ['color', colorShapes],
    ['combine', combineShapes],
    ['split', splitShapes],
]

export const stepShapes: Record<OperationName, ReadonlyArray<Shape>> = { ...sourceShapes, ...coordinateShapes, ...colorShapes, ...combineShapes, ...splitShapes }

export const stepKinds = new Map(groups.flatMap(([kind, shapes]) => Object.keys(shapes).map((name) => [name, kind] as const)))

export const neutralValues: Partial<Record<OperationName, ReadonlyArray<number>>> = {
    solid: [0, 0, 0, 1],
    scale: [1, 1],
    move: [0, 0],
    pixelate: [0, 0],
    repeat: [0, 0],
    shift: [0, 0, 0],
    split: [0, 0],
}

const isDefined = (value: Parameter | undefined): value is Parameter => value !== undefined

export const createArguments = (name: OperationName, values: ReadonlyArray<Parameter | undefined>): ReadonlyArray<Argument> => {
    const neutral = neutralValues[name]
    const given = values.filter(isDefined)

    if (neutral === undefined || given.length === 1) {
        return given
    }

    return [neutral.map((fallback, index) => values[index] ?? fallback)]
}
