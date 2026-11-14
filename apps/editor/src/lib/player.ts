import type { EvaluationResult, Location, Warning } from '@lovechild/strudel'
import type { Hap } from '@strudel/core'
import { getContext, setContext } from 'svelte'

export interface Example {
    id: symbol
    code: string
    isAutomatic?: boolean
    onFrame: (time: number, haps: ReadonlyArray<Hap>) => void
    showWarning?: (warning: Warning) => void
    showError?: (error: unknown, locations: ReadonlyArray<Location>) => void
}

export interface ExamplePlayer {
    readonly playing: symbol | undefined
    readonly code: string | undefined
    play: (example: Example) => Promise<EvaluationResult | undefined>
    stop: () => void
}

const key = Symbol('example player')

export const setExamplePlayer = (player: ExamplePlayer) => setContext(key, player)

export const getExamplePlayer = () => getContext<ExamplePlayer>(key)
