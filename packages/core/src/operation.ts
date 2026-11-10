import type { Chain } from './chain'

export interface Signal {
    queryArc: (begin: number, end: number) => ReadonlyArray<{ readonly value: unknown }>
}

export type Value = number | string | Signal

export type Parameter = Value | Chain

export type SourceName = 'osc' | 'shape' | 'solid' | 'noise' | 'voronoi' | 'gradient' | 'empty'

export type CoordinateName = 'rotate' | 'scale' | 'scaleX' | 'scaleY' | 'move' | 'moveBy' | 'moveX' | 'moveY' | 'kaleid' | 'pixelate' | 'pixelateX' | 'pixelateY' | 'repeat' | 'repeatX' | 'repeatY'

export type ColorName = 'invert' | 'channels' | 'range' | 'brightness' | 'contrast' | 'saturate' | 'hue' | 'colorama' | 'shift' | 'shiftBy' | 'posterize' | 'thresh' | 'luma'

export type CombineName = 'add' | 'sub' | 'mult' | 'diff' | 'layer' | 'mask' | 'blend' | 'screen'

export type SplitName = 'split' | 'splitX' | 'splitY'

export type OperationName = SourceName | CoordinateName | ColorName | CombineName | SplitName

export type MediaName = 'camera' | 'video' | 'image'

export type Operation =
    | { kind: 'source', name: SourceName, parameters: ReadonlyArray<Parameter> }
    | { kind: 'coordinate', name: CoordinateName, input: Operation, parameters: ReadonlyArray<Parameter> }
    | { kind: 'color', name: ColorName, input: Operation, parameters: ReadonlyArray<Parameter> }
    | { kind: 'combine', name: CombineName, input: Operation, other: Operation, parameters: ReadonlyArray<Parameter> }
    | { kind: 'split', name: SplitName, input: Operation, parameters: ReadonlyArray<Parameter> }
    | { kind: 'swizzle', input: Operation, channels: string }
    | { kind: 'select', options: ReadonlyArray<Operation>, parameters: ReadonlyArray<Parameter> }
    | { kind: 'media', name: MediaName, source: string }
    | { kind: 'previous', block?: string }
    | { kind: 'feedback', input: Operation }

export type Step = Extract<Operation, { name: OperationName }>

export type Feedback = Extract<Operation, { kind: 'feedback' }>

export type Media = Extract<Operation, { kind: 'media' }>

export type Select = Extract<Operation, { kind: 'select' }>
