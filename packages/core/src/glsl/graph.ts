import type { MediaName, Value } from '../operation'

export type Frame = 'current' | 'previous'

export interface Uniform { name: string, value: Value, encode: (value: unknown) => number }

export interface BufferInput { name: string, buffer: number, frame: Frame }

export interface MediaInput { name: MediaName, source: string }

export type Target = { kind: 'screen' } | { kind: 'buffer', index: number } | { kind: 'preview', index: number }

export interface Pass { source: string, target: Target, inputs: ReadonlyArray<BufferInput>, media: ReadonlyArray<number> }

export interface Graph { uniforms: ReadonlyArray<Uniform>, passes: ReadonlyArray<Pass>, bufferCount: number, media: ReadonlyArray<MediaInput> }
