declare module '@strudel/core' {
    export interface Fraction {
        lt: (other: Fraction) => boolean
        gt: (other: Fraction) => boolean
        max: (other: Fraction) => Fraction
        valueOf: () => number
    }

    export const Fraction: (value: number) => Fraction

    export class TimeSpan {
        readonly begin: Fraction
        readonly end: Fraction
        constructor(begin: Fraction, end: Fraction)
        intersection(other: TimeSpan): TimeSpan | undefined
    }

    export interface State {
        span: TimeSpan
    }

    export interface HapContext {
        locations?: ReadonlyArray<{ start: number, end: number }>
    }

    export class Hap<Value = unknown> {
        readonly whole: TimeSpan | undefined
        readonly part: TimeSpan
        readonly value: Value
        readonly context: HapContext
        constructor(whole: TimeSpan | undefined, part: TimeSpan, value: Value, context: HapContext)
    }

    export type PatternTransform = (pattern: Pattern) => Pattern

    export type SelectionName = 'sometimes' | 'sometimesBy' | 'often' | 'rarely' | 'almostNever' | 'almostAlways' | 'always' | 'never' | 'someCycles' | 'someCyclesBy' | 'firstOf' | 'every' | 'lastOf' | 'when' | 'chunk' | 'chunkBack'

    export type SelectionArgument = number | string | Pattern | PatternTransform

    export type HitLength = number | string | Pattern

    export interface Pattern<Value = unknown> extends Record<SelectionName, (...values: ReadonlyArray<SelectionArgument>) => Pattern<number>> {
        hits: (...lengths: ReadonlyArray<HitLength>) => Pattern<number>
        degradeBy: (amount: number | string | Pattern) => Pattern<Value>
        query: (state: State) => Array<Hap<Value>>
        fmap: <Next>(transform: (value: Value) => Next) => Pattern<Next>
        queryArc: (begin: number, end: number) => Array<Hap<Value>>
    }

    export const Pattern: {
        prototype: Pattern
        new <Value>(query: (state: State) => Array<Hap<Value>>): Pattern<Value>
    }

    export type Trigger = (hap: Hap, deadline: number, duration: number, cps: number, time: number) => void

    export class Cyclist {
        readonly started: boolean
        readonly cps: number
        readonly latency: number
        readonly clock: { duration: number }
        constructor(options: { getTime: () => number, onTrigger: Trigger, onError?: (error: unknown) => void })
        now(): number
        setCps(cps: number): void
        setPattern(pattern: Pattern): Promise<void>
        start(): Promise<void>
        stop(): void
    }

    export const setTime: (getTime: () => number) => void
    export const isPattern: (value: unknown) => value is Pattern
    export const reify: <Value>(value: Value | Pattern<Value>) => Pattern<Value>
    export const stack: (...patterns: Array<Pattern>) => Pattern
    export const silence: Pattern
    export const pure: <Value>(value: Value) => Pattern<Value>
    export const signal: (getValue: (time: Fraction) => number) => Pattern<number>
    export const register: (name: string, transform: ((pattern: Pattern<number>) => Pattern<number>) | ((argument: number, pattern: Pattern) => Pattern<number>)) => void
}

declare module '@strudel/mini' {
    export interface MiniAtom {
        type_: 'atom'
        source_: string
    }

    export type MiniOperation =
        | { type_: 'stretch', arguments_: { type: 'fast' | 'slow', amount: MiniNode } }
        | { type_: 'replicate', arguments_: { amount: number } }
        | { type_: 'bjorklund', arguments_: { pulse: MiniNode, step: MiniNode, rotation?: MiniNode } }
        | { type_: 'degradeBy', arguments_: { amount: number | null, seed: number } }
        | { type_: 'tail', arguments_: { element: MiniNode } }
        | { type_: 'range', arguments_: { element: MiniNode } }

    export interface MiniElement {
        type_: 'element'
        source_: MiniNode
        options_: { ops: Array<MiniOperation>, weight: number, reps: number }
    }

    export interface MiniPattern {
        type_: 'pattern'
        arguments_: { alignment: string, seed?: number, stepsPerCycle?: MiniNode }
        source_: Array<MiniNode>
    }

    export interface MiniStretch {
        type_: 'stretch'
        source_: MiniNode
        arguments_: { amount: MiniNode }
    }

    export type MiniNode = MiniAtom | MiniElement | MiniPattern | MiniStretch

    export const mini2ast: (code: string) => MiniNode
}

declare module '@strudel/tonal' {
}

declare module '@strudel/webaudio' {
    import type { Trigger } from '@strudel/core'

    export const webaudioOutput: (...values: Parameters<Trigger>) => Promise<void>
    export const getAudioContext: () => AudioContext
    export const initAudio: () => Promise<void>
    export const registerSynthSounds: () => void
    export const samples: (source: string, baseUrl?: string) => Promise<void>
    export const aliasBank: (path: string) => Promise<void>
}

declare module '@strudel/draw' {
    export const cleanupDraw: (clearScreen: boolean) => void
}

declare module '@strudel/transpiler' {
    export interface Widget {
        to: number
        index: number
        type: string
    }

    export const registerWidgetType: (type: string) => void
    export const transpiler: (input: string, options: { wrapAsync: true }) => { output: string, miniLocations: Array<[number, number]>, widgets: Array<Widget> }
}
