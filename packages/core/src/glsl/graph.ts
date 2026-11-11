import type { MediaName, TextSettings, Value } from '../operation'

export type Frame = 'current' | 'previous'

export interface Uniform { name: string, value: Value, encode: (value: unknown) => number, colorChannel?: number }

export interface BufferInput { name: string, buffer: number, frame: Frame }

export type MediaInput = { key: string } & ({ name: MediaName, source: string } | { name: 'text', settings: TextSettings })

export type Target = { kind: 'screen' } | { kind: 'buffer', index: number } | { kind: 'preview', index: number }

export interface Pass { source: string, target: Target, inputs: ReadonlyArray<BufferInput>, media: ReadonlyArray<number> }

export interface Graph { uniforms: ReadonlyArray<Uniform>, passes: ReadonlyArray<Pass>, bufferCount: number, media: ReadonlyArray<MediaInput> }
