import { Chain } from './chain'
import type { Parameter, SourceName } from './operation'

const createSource = (name: SourceName, parameters: ReadonlyArray<Parameter>) => new Chain({ kind: 'source', name, parameters })

export const osc = (frequency: Parameter = 10, phase: Parameter = 0) => createSource('osc', [frequency, phase])

export const shape = (sides: Parameter = 3) => createSource('shape', [sides])

export const polygon = shape

export const solid = (red: Parameter = 0, green: Parameter = 0, blue: Parameter = 0) => createSource('solid', [red, green, blue])

export const noise = (scale: Parameter = 10, phase: Parameter = 0, offset: Parameter = 0) => createSource('noise', [scale, phase, offset])

export const voronoi = (scale: Parameter = 5, phase: Parameter = 0, blending: Parameter = 0.3) => createSource('voronoi', [scale, phase, blending])

export const gradient = () => createSource('gradient', [])

export const previous = (block?: string) => new Chain({ kind: 'previous', block })

export const camera = () => new Chain({ kind: 'media', name: 'camera', source: '' })

export const video = (source: string) => new Chain({ kind: 'media', name: 'video', source })

export const image = (source: string) => new Chain({ kind: 'media', name: 'image', source })
