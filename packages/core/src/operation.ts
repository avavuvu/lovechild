import type { Image } from './image'
import type { colors } from './steps/colors'
import type { combines } from './steps/combines'
import type { coordinates } from './steps/coordinates'
import type { sources } from './steps/sources'
import type { splits } from './steps/splits'

export interface Pattern {
    queryArc: (begin: number, end: number) => ReadonlyArray<{ readonly value: unknown }>
}

export type Value = number | string | Pattern

export type Scalar = number | Pattern

export type Amount = Scalar | Image

export type Paint = number | string | Pattern | Image

export type Keyword = string | Pattern

export type Parameter = Value | Image

export type Argument = Parameter | ReadonlyArray<Parameter>

export type SourceName = keyof typeof sources

export type CoordinateName = keyof typeof coordinates

export type ColorName = keyof typeof colors

export type CombineName = keyof typeof combines

export type SplitName = keyof typeof splits

export type OperationName = SourceName | CoordinateName | ColorName | CombineName | SplitName

export type MediaName = 'camera' | 'video' | 'picture'

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
    | { kind: 'previous', track?: string }
    | { kind: 'feedback', input: Operation }

export type Step = Extract<Operation, { name: OperationName }>

export type Feedback = Extract<Operation, { kind: 'feedback' }>

export type Media = Extract<Operation, { kind: 'media' }>

export type Text = Extract<Operation, { kind: 'text' }>

export type Select = Extract<Operation, { kind: 'select' }>
