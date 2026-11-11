import { Chain, closeLoop, isChain, isEmptyLoop } from '@lovechild/core'
import { isPattern, Pattern, silence } from '@strudel/core'
import { registerWidgetType, transpiler, type Widget } from '@strudel/transpiler'
import { createNames, isName, type Block } from './names'
import { getNamedChains } from './visuals'

export type MiniLocation = [number, number]

export interface Preview {
    id: string
    chain: Chain
}

export interface Evaluation {
    blocks: ReadonlyArray<Block>
    names: ReadonlyMap<string, Block>
    previews: ReadonlyArray<Preview>
    miniLocations: ReadonlyArray<MiniLocation>
    widgets: ReadonlyArray<Widget>
}

registerWidgetType('preview')

const isMuted = (label: string) => label.startsWith('_') || label.endsWith('_')

export const getBlockName = (label: string) => label.replace(/^_+|_+$/g, '')

const isBlock = (value: unknown): value is Block => isChain(value) || isPattern(value)

const closeBlock = (block: Block) => isChain(block) ? closeLoop(block) : block

interface Registered {
    name: string
    block: Block
}

const checkLoops = (registered: ReadonlyArray<Registered>, names: ReadonlyMap<string, Block>) => {
    const chains = getNamedChains(names)
    const empty = registered.find(({ name, block }) => isChain(block) && isEmptyLoop(block, chains, isName(name) ? name : undefined))

    if (empty) {
        throw new Error(`${isName(empty.name) ? empty.name : '$:'} only reads previous frames`)
    }
}

export const evaluateCode = async (code: string, scope: Record<string, unknown>, inputs: ReadonlyMap<string, Block> = new Map()): Promise<Evaluation> => {
    const { output, miniLocations, widgets } = transpiler(code, { wrapAsync: true })
    const names = createNames(inputs)
    const blocks = new Map<string, Block>()
    const previews: Array<Preview> = []
    const registered: Array<Registered> = []
    let anonymousCount = 0

    const registerBlock = function (this: Block, label: string) {
        const name = getBlockName(label)
        const block = closeBlock(this)
        registered.push({ name, block })

        if (isName(name)) {
            names.defineName(name, block)
        }

        if (isMuted(label)) {
            return silence
        }

        const id = name === '$' ? name + anonymousCount : name
        anonymousCount += 1
        blocks.set(id, block)
        return block
    }

    const registerPreview = function (this: Chain, id: string) {
        previews.push({ id, chain: this })
        return this
    }

    for (const prototype of [Pattern.prototype, Chain.prototype]) {
        Object.defineProperty(prototype, 'p', { value: registerBlock, configurable: true, writable: true })
    }

    Object.defineProperty(Chain.prototype, 'preview', { value: registerPreview, configurable: true, writable: true })

    const values = { ...scope, previous: names.readPrevious }
    const run = new Function('lookup', ...Object.keys(values), 'with (lookup) { return ' + output + ' }')
    const result: unknown = await run(names.lookup, ...Object.values(values))

    const shown = blocks.size > 0 ? Array.from(blocks.values()) : [result].filter(isBlock).map(closeBlock)
    checkLoops(blocks.size > 0 ? registered : shown.map((block) => ({ name: '$', block })), names.blocks)

    return {
        blocks: shown,
        names: names.blocks,
        previews,
        miniLocations,
        widgets,
    }
}
