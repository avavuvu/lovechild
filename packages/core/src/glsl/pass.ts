import type { Image } from '../image'
import type { Feedback, Media, Operation, Select, Step, Text } from '../operation'
import { createCache } from './cache'
import type { Pass, Target } from './graph'
import { definitions, type Shape } from '../steps'
import { baseCoordinate, createShader } from './shader'

type Scope = Feedback | undefined

export type Component = string | Image

export type Declared = Component | ReadonlyArray<Component>

export interface Resources {
    declareUniforms: (step: Step | Select) => ReadonlyArray<Declared>
    getMedia: (operation: Media | Text) => number
    getBuffer: (feedback: Feedback) => number
    getTrackLoop: (name: string) => Feedback
}

const vectorTypes: Record<Shape, string> = { scalar: 'float', xy: 'vec2', rgb: 'vec3', rgba: 'vec4' }

const imageChannels: Record<Shape, string> = { scalar: '', xy: 'rg', rgb: 'rgb', rgba: 'rgba' }

const isComponents = (declared: Declared): declared is ReadonlyArray<Component> => Array.isArray(declared)

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

    const emitComponent = (component: Component, coordinate: string, scope: Scope) => {
        if (typeof component === 'string') {
            return shader.useUniform(component)
        }

        return `${emitOperation(component.operation, coordinate, scope)}.r`
    }

    const emitArgument = (declared: Declared, shape: Shape, coordinate: string, scope: Scope) => {
        if (isComponents(declared)) {
            return `${vectorTypes[shape]}(${declared.map((component) => emitComponent(component, coordinate, scope)).join(', ')})`
        }

        if (shape === 'scalar') {
            return emitComponent(declared, coordinate, scope)
        }

        if (typeof declared === 'string') {
            const value = shader.useUniform(declared)
            return shape === 'rgba' ? `vec4(vec3(${value}), 1.0)` : `${vectorTypes[shape]}(${value})`
        }

        return `${emitOperation(declared.operation, coordinate, scope)}.${imageChannels[shape]}`
    }

    const emitParameters = (step: Step | Select, coordinate: string, scope: Scope) => {
        const shapes = step.kind === 'select' ? ['scalar' as const] : definitions[step.name].shapes
        return resources.declareUniforms(step).map((declared, index) => emitArgument(declared, shapes[index] ?? 'scalar', coordinate, scope))
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

    const emitPrevious = (track: string | undefined, coordinate: string, scope: Scope) => {
        const loop = track === undefined ? scope : resources.getTrackLoop(track)

        if (loop === undefined) {
            throw new Error('previous() must be inside a track')
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
            case 'text': {
                const mask = shader.sampleMedia(resources.getMedia(operation), coordinate)
                const fill = emitOperation(operation.fill, coordinate, scope)
                const stroke = emitOperation(operation.stroke, coordinate, scope)
                shader.useHelper('paintText')
                return shader.declareVariable('vec4', `paintText(${mask}, ${fill}, ${stroke})`)
            }
            case 'previous': {
                return emitPrevious(operation.track, coordinate, scope)
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
