import { isChain, previous, type Chain } from '@lovechild/core'
import type { Pattern } from '@strudel/core'

export type Block = Chain | Pattern

export const isName = (key: string) => key.length > 1 && key.startsWith('$')

export const createNames = () => {
    const blocks = new Map<string, Block>()
    const blockNames = new WeakMap<object, string>()
    const laterNames = new Map<string, object>()

    const getLaterName = (name: string) => {
        const existing = laterNames.get(name)

        if (existing) {
            return existing
        }

        const later = new Proxy({}, {
            get: () => {
                throw new Error(`${name} is not defined`)
            },
        })

        blockNames.set(later, name)
        laterNames.set(name, later)
        return later
    }

    const lookup = new Proxy({}, {
        has: (_target, key) => typeof key === 'string' && isName(key),
        get: (_target, key) => {
            if (typeof key !== 'string') {
                return undefined
            }

            return blocks.has(key) ? blocks.get(key) : getLaterName(key)
        },
    })

    const defineName = (name: string, block: Block) => {
        blocks.set(name, block)

        if (isChain(block)) {
            blockNames.set(block, name)
        }
    }

    const readPrevious = (block?: object) => {
        if (block === undefined) {
            return previous()
        }

        const name = blockNames.get(block)

        if (name === undefined) {
            throw new Error('previous() takes a named block')
        }

        return previous(name)
    }

    return { blocks, lookup, defineName, readPrevious }
}
