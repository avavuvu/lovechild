import { Chain, closeLoop, isChain } from '@lovechild/core'
import { isPattern, Pattern, silence } from '@strudel/core'
import { registerWidgetType, transpiler, type Widget } from '@strudel/transpiler'
import { createNames, isName, type Block } from './names'

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

export const evaluateCode = async (code: string, scope: Record<string, unknown>): Promise<Evaluation> => {
    const { output, miniLocations, widgets } = transpiler(code, { wrapAsync: true })
    const names = createNames()
    const blocks = new Map<string, Block>()
    const previews: Array<Preview> = []
    let anonymousCount = 0

    const registerBlock = function (this: Block, label: string) {
        const name = getBlockName(label)
        const block = closeBlock(this)

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

    return {
        blocks: blocks.size > 0 ? Array.from(blocks.values()) : [result].filter(isBlock).map(closeBlock),
        names: names.blocks,
        previews,
        miniLocations,
        widgets,
    }
}
