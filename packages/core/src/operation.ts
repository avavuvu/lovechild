import type { Chain } from './chain'

export interface Signal {
    queryArc: (begin: number, end: number) => ReadonlyArray<{ readonly value: unknown }>
}

export type Value = number | string | Signal

export type Parameter = Value | Chain

export type Argument = Parameter | ReadonlyArray<Parameter>

export type SourceName = 'osc' | 'shape' | 'solid' | 'noise' | 'simplex' | 'voronoi' | 'gradient' | 'empty' | 'paint' | 'hsv' | 'oklch'

export type CoordinateName = 'rotate' | 'scale' | 'move' | 'kaleid' | 'pixelate' | 'repeat'

export type ColorName = 'invert' | 'channels' | 'range' | 'brightness' | 'contrast' | 'saturate' | 'hue' | 'colorama' | 'shift' | 'grey' | 'posterize' | 'thresh' | 'luma'

export type CombineName = 'add' | 'sub' | 'mult' | 'diff' | 'layer' | 'mask' | 'blend' | 'screen'

export type SplitName = 'split'

export type OperationName = SourceName | CoordinateName | ColorName | CombineName | SplitName

export type MediaName = 'camera' | 'video' | 'image'

export interface TextSettings {
    content: Value
    font?: Value
    outline?: Value
    wrap?: Value
}

export type Operation =
    | { kind: 'source', name: SourceName, parameters: ReadonlyArray<Argument> }
    | { kind: 'coordinate', name: CoordinateName, input: Operation, parameters: ReadonlyArray<Argument> }
    | { kind: 'color', name: ColorName, input: Operation, parameters: ReadonlyArray<Argument> }
    | { kind: 'combine', name: CombineName, input: Operation, other: Operation, parameters: ReadonlyArray<Argument> }
    | { kind: 'split', name: SplitName, input: Operation, parameters: ReadonlyArray<Argument> }
    | { kind: 'swizzle', input: Operation, channels: string }
    | { kind: 'select', options: ReadonlyArray<Operation>, parameters: ReadonlyArray<Argument> }
    | { kind: 'media', name: MediaName, source: string }
    | { kind: 'text', settings: TextSettings, fill: Operation, stroke: Operation }
    | { kind: 'previous', block?: string }
    | { kind: 'feedback', input: Operation }

export type Step = Extract<Operation, { name: OperationName }>

export type Feedback = Extract<Operation, { kind: 'feedback' }>

export type Media = Extract<Operation, { kind: 'media' }>

export type Text = Extract<Operation, { kind: 'text' }>

export type Select = Extract<Operation, { kind: 'select' }>
