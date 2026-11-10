import type { Chain } from '../chain'
import type { Feedback, Media, Operation, Select, Step } from '../operation'
import { createCache } from './cache'
import type { Pass, Target } from './graph'
import { vectorParameters } from './library'
import { baseCoordinate, createShader } from './shader'

type Scope = Feedback | undefined

export interface Resources {
    declareUniforms: (step: Step | Select) => ReadonlyArray<string | Chain>
    getMedia: (operation: Media) => number
    getBuffer: (feedback: Feedback) => number
    getBlockLoop: (name: string) => Feedback
}

const formatSwizzle = (input: string, channels: string) => {
    switch (channels.length) {
        case 1: {
            return `vec4(vec3(${input}.${channels}), 1.0)`
        }
        case 2: {
            return `vec4(${input}.${channels}, 0.0, 1.0)`
        }
        case 3: {
            return `vec4(${input}.${channels}, 1.0)`
        }
        default: {
            return `${input}.${channels}`
        }
    }
}

export const generatePass = (root: Operation, owner: Scope, target: Target, resources: Resources): Pass => {
    const shader = createShader()
    const cache = createCache()

    const emitParameters = (step: Step | Select, coordinate: string, scope: Scope) => {
        return resources.declareUniforms(step).map((entry) => {
            if (typeof entry === 'string') {
                return shader.useUniform(entry)
            }

            const image = emitOperation(entry.operation, coordinate, scope)
            const channels = step.kind === 'select' ? undefined : vectorParameters[step.name]

            if (channels !== undefined) {
                return `${image}.${channels}`
            }

            shader.useHelper('luminance')
            return `luminance(${image})`
        })
    }

    const callFunction = (step: Step, values: ReadonlyArray<string>, coordinate: string, scope: Scope) => {
        shader.useFunction(step.name)
        return `${step.name}(${[...values, ...emitParameters(step, coordinate, scope)].join(', ')})`
    }

    const emitSelect = (operation: Select, coordinate: string, scope: Scope) => {
        const [selector] = emitParameters(operation, coordinate, scope)
        const result = shader.declareResult()

        for (const [index, option] of operation.options.entries()) {
            const isLast = index === operation.options.length - 1
            const condition = isLast ? '' : `if (${selector} < ${index}.5) `
            shader.addStatement((index === 0 ? '' : '} else ') + condition + '{')
            cache.runIsolated(() => shader.addStatement(`    ${result} = ${emitOperation(option, coordinate, scope)};`))
        }

        shader.addStatement('}')
        return result
    }

    const emitSplit = (operation: Extract<Operation, { kind: 'split' }>, coordinate: string, scope: Scope) => {
        const offset = shader.declareVariable('vec2', callFunction(operation, [], coordinate, scope))
        const red = emitOperation(operation.input, shader.declareVariable('vec2', `${coordinate} - ${offset}`), scope)
        const green = emitOperation(operation.input, coordinate, scope)
        const blue = emitOperation(operation.input, shader.declareVariable('vec2', `${coordinate} + ${offset}`), scope)
        return shader.declareVariable('vec4', `vec4(${red}.r, ${green}.g, ${blue}.b, ${green}.a)`)
    }

    const emitPrevious = (block: string | undefined, coordinate: string, scope: Scope) => {
        const loop = block === undefined ? scope : resources.getBlockLoop(block)

        if (loop === undefined) {
            throw new Error('previous() must be inside a block')
        }

        return shader.sampleBuffer(resources.getBuffer(loop), 'previous', coordinate)
    }

    const emitFeedback = (operation: Feedback, coordinate: string) => {
        const buffer = resources.getBuffer(operation)

        if (coordinate === baseCoordinate) {
            return shader.sampleBuffer(buffer, 'current', coordinate)
        }

        return emitOperation(operation.input, coordinate, operation)
    }

    const emitStep = (operation: Operation, coordinate: string, scope: Scope): string => {
        switch (operation.kind) {
            case 'source': {
                return shader.declareVariable('vec4', callFunction(operation, [coordinate], coordinate, scope))
            }
            case 'coordinate': {
                const transformed = shader.declareVariable('vec2', callFunction(operation, [coordinate], coordinate, scope))
                return emitOperation(operation.input, transformed, scope)
            }
            case 'color': {
                const input = emitOperation(operation.input, coordinate, scope)
                return shader.declareVariable('vec4', callFunction(operation, [input], coordinate, scope))
            }
            case 'combine': {
                const input = emitOperation(operation.input, coordinate, scope)
                const other = emitOperation(operation.other, coordinate, scope)
                return shader.declareVariable('vec4', callFunction(operation, [input, other], coordinate, scope))
            }
            case 'swizzle': {
                const input = emitOperation(operation.input, coordinate, scope)
                return shader.declareVariable('vec4', formatSwizzle(input, operation.channels))
            }
            case 'select': {
                return emitSelect(operation, coordinate, scope)
            }
            case 'split': {
                return emitSplit(operation, coordinate, scope)
            }
            case 'media': {
                return shader.sampleMedia(resources.getMedia(operation), coordinate)
            }
            case 'previous': {
                return emitPrevious(operation.block, coordinate, scope)
            }
            case 'feedback': {
                return emitFeedback(operation, coordinate)
            }
        }
    }

    const emitOperation = (operation: Operation, coordinate: string, scope: Scope): string => {
        const key = coordinate + ':' + (scope === undefined ? '' : resources.getBuffer(scope))
        const cached = cache.findVariable(operation, key)

        if (cached !== undefined) {
            return cached
        }

        const variable = emitStep(operation, coordinate, scope)
        cache.storeVariable(operation, key, variable)
        return variable
    }

    return shader.buildPass(emitOperation(root, baseCoordinate, owner), target)
}
