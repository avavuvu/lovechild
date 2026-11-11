import { isChain, type Chain, type Uniform } from '@lovechild/core'
import { reify, type Hap } from '@strudel/core'
import type { Block } from './names'

export interface ValueReader {
    values: ReadonlyArray<number>
    updateValues: (time: number) => Array<Hap>
}

export const layerChains = (blocks: ReadonlyArray<Block>) => {
    const chains = blocks.filter(isChain)
    return chains.length > 0 ? chains.reduce((layered, next) => layered.screen(next)) : undefined
}

export const getNamedChains = (names: ReadonlyMap<string, Block>) => new Map(Array.from(names).filter((entry): entry is [string, Chain] => isChain(entry[1])))

export const createValueReader = (uniforms: ReadonlyArray<Uniform>): ValueReader => {
    const patterns = uniforms.map((uniform) => reify(uniform.value))
    const values = uniforms.map(() => 0)

    const updateValues = (time: number) => patterns.flatMap((pattern, index) => {
        const found = pattern.queryArc(time, time)

        if (found.length > 0) {
            values[index] = uniforms[index].encode(found[0].value)
        }

        return found
    })

    return { values, updateValues }
}
