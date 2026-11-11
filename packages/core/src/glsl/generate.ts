import { isChain, type Chain } from '../chain'
import { encodeChannels } from '../channels'
import type { Argument, Feedback, Media, Operation, Parameter, Text } from '../operation'
import { getChildren, hasFreePrevious } from '../tree'
import type { Graph, MediaInput, Pass, Target, Uniform } from './graph'
import { generatePass, type Declared, type Resources } from './pass'

const isComponents = (argument: Argument): argument is ReadonlyArray<Parameter> => Array.isArray(argument)

const findScope = (operation: Operation, target: Operation, scope: Feedback | undefined): Feedback | undefined => {
    if (operation === target) {
        return scope
    }

    const childScope = operation.kind === 'feedback' ? operation : scope

    for (const child of getChildren(operation)) {
        const found = findScope(child, target, childScope)

        if (found !== undefined) {
            return found
        }
    }

    return undefined
}

export const generateGraph = (screen: Chain | undefined, previews: ReadonlyArray<Chain>, blocks: ReadonlyMap<string, Chain>): Graph => {
    const uniforms: Array<Uniform> = []
    const uniformNames = new Map<Operation, ReadonlyArray<Declared>>()
    const buffers = new Map<Feedback, number>()
    const blockLoops = new Map<string, Feedback>()
    const media: Array<MediaInput> = []
    const mediaIndexes = new Map<string, number>()
    const textKeys = new Map<Text, string>()
    const passes: Array<Pass> = []

    const getTextKey = (operation: Text) => {
        const existing = textKeys.get(operation)

        if (existing !== undefined) {
            return existing
        }

        const key = 'text:' + textKeys.size
        textKeys.set(operation, key)
        return key
    }

    const addPass = (root: Operation, owner: Feedback | undefined, target: Target) => {
        passes.push(generatePass(root, owner, target, resources))
    }

    const resources: Resources = {
        declareUniforms: (step) => {
            const existing = uniformNames.get(step)

            if (existing) {
                return existing
            }

            const encode = step.kind === 'color' && step.name === 'channels' ? encodeChannels : Number
            const isPaint = step.kind === 'source' && step.name === 'paint'

            const declareComponent = (value: Parameter, index: number) => {
                if (isChain(value)) {
                    return value
                }

                if (typeof value === 'function') {
                    throw new Error(`${step.kind === 'select' ? 'select' : step.name} was given a function, add ()`)
                }

                const name = `parameter${uniforms.length}`
                uniforms.push(isPaint ? { name, value, encode, colorChannel: index } : { name, value, encode })
                return name
            }

            const names = step.parameters.map((argument, index) => isComponents(argument) ? argument.map(declareComponent) : declareComponent(argument, index))

            uniformNames.set(step, names)
            return names
        },
        getMedia: (operation: Media | Text) => {
            const key = operation.kind === 'text' ? getTextKey(operation) : operation.name + ':' + operation.source
            const existing = mediaIndexes.get(key)

            if (existing !== undefined) {
                return existing
            }

            const index = media.length
            media.push(operation.kind === 'text' ? { key, name: 'text', settings: operation.settings } : { key, name: operation.name, source: operation.source })
            mediaIndexes.set(key, index)
            return index
        },
        getBuffer: (feedback) => {
            const existing = buffers.get(feedback)

            if (existing !== undefined) {
                return existing
            }

            const index = buffers.size
            buffers.set(feedback, index)
            addPass(feedback.input, feedback, { kind: 'buffer', index })
            return index
        },
        getBlockLoop: (name) => {
            const existing = blockLoops.get(name)

            if (existing) {
                return existing
            }

            const block = blocks.get(name)

            if (block === undefined) {
                throw new Error(`${name} is not defined`)
            }

            const loop: Feedback = block.operation.kind === 'feedback' ? block.operation : { kind: 'feedback', input: block.operation }
            blockLoops.set(name, loop)
            return loop
        },
    }

    const roots = [screen, ...previews].filter((chain) => chain !== undefined).map((chain) => chain.operation)

    const getPreviewScope = (operation: Operation): Feedback | undefined => {
        if (!hasFreePrevious(operation)) {
            return undefined
        }

        for (const root of roots) {
            const scope = findScope(root, operation, undefined)

            if (scope !== undefined) {
                return scope
            }
        }

        return { kind: 'feedback', input: operation }
    }

    if (screen) {
        addPass(screen.operation, undefined, { kind: 'screen' })
    }

    for (const [index, preview] of previews.entries()) {
        addPass(preview.operation, getPreviewScope(preview.operation), { kind: 'preview', index })
    }

    return { uniforms, passes, bufferCount: buffers.size, media }
}
