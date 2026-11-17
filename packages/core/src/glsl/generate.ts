import { isImage, type Image } from '../image'
import type { Argument, Capture, Feedback, Media, Operation, Parameter, Text } from '../operation'
import { definitions } from '../steps'
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

const findReadNames = (roots: ReadonlyArray<Operation>, imagesByName: ReadonlyMap<string, Image>) => {
    const names = new Set<string>()
    const seen = new Set<Operation>()

    const visit = (operation: Operation) => {
        if (seen.has(operation)) {
            return
        }

        seen.add(operation)

        if (operation.kind === 'previous' && operation.imageName !== undefined && !names.has(operation.imageName)) {
            names.add(operation.imageName)
            const named = imagesByName.get(operation.imageName)

            if (named) {
                visit(named.operation)
            }
        }

        getChildren(operation).forEach(visit)
    }

    roots.forEach(visit)
    return names
}

export const generateGraph = (screen: Image | undefined, previews: ReadonlyArray<Image>, imagesByName: ReadonlyMap<string, Image>): Graph => {
    const uniforms: Array<Uniform> = []
    const uniformNames = new Map<Operation, ReadonlyArray<Declared>>()
    const buffers = new Map<Feedback | Capture, number>()
    const namedLoops = new Map<string, Feedback>()
    const media: Array<MediaInput> = []
    const mediaIndexes = new Map<string, number>()
    const textKeys = new Map<Text, string>()
    const passes: Array<Pass> = []
    const roots = [screen, ...previews].filter((image) => image !== undefined).map((image) => image.operation)

    const loopInputs = new Map(Array.from(findReadNames(roots, imagesByName)).flatMap((name): Array<[Operation, string]> => {
        const named = imagesByName.get(name)
        return named && named.operation.kind !== 'feedback' ? [[named.operation, name]] : []
    }))

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

            const definition = step.kind === 'select' ? undefined : definitions[step.name]
            const encode = definition?.encode ?? Number

            const declareComponent = (value: Parameter, index: number) => {
                if (isImage(value)) {
                    return value
                }

                if (typeof value === 'function') {
                    throw new Error(`${step.kind === 'select' ? 'select' : step.name} was given a function, add ()`)
                }

                const name = `parameter${uniforms.length}`
                const channel = definition?.hasColorChannels ? { colorChannel: index } : {}
                const onset = definition?.isOnset ? { isOnset: true } : {}
                uniforms.push({ name, value, encode, ...channel, ...onset })
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
        getCaptureBuffer: (capture, scope) => {
            const existing = buffers.get(capture)

            if (existing !== undefined) {
                return existing
            }

            const index = buffers.size
            buffers.set(capture, index)
            addPass(capture, scope, { kind: 'buffer', index })
            return index
        },
        getNamedLoop: (name) => {
            const existing = namedLoops.get(name)

            if (existing) {
                return existing
            }

            const named = imagesByName.get(name)

            if (named === undefined) {
                throw new Error(`${name} is not defined`)
            }

            const loop: Feedback = named.operation.kind === 'feedback' ? named.operation : { kind: 'feedback', input: named.operation }
            namedLoops.set(name, loop)
            return loop
        },
        findNamedLoop: (operation) => {
            const name = loopInputs.get(operation)
            return name === undefined ? undefined : resources.getNamedLoop(name)
        },
    }

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
