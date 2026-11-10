import type { OperationName } from '../operation'
import type { BufferInput, Frame, Pass, Target } from './graph'
import { functionHelpers, helpers, type Helper } from './helpers'
import { library } from './library'

export const baseCoordinate = 'coordinate'

export const createShader = () => {
    const functions = new Set<OperationName>()
    const usedHelpers = new Set<Helper>()
    const uniforms = new Set<string>()
    const inputs = new Map<string, BufferInput>()
    const media = new Set<number>()
    const statements: Array<string> = []

    const addStatement = (statement: string) => {
        statements.push(statement)
    }

    const declareVariable = (type: 'vec2' | 'vec4', expression: string) => {
        const name = (type === 'vec2' ? 'coordinate' : 'color') + statements.length
        statements.push(`${type} ${name} = ${expression};`)
        return name
    }

    const declareResult = () => {
        const name = 'color' + statements.length
        statements.push(`vec4 ${name};`)
        return name
    }

    const useUniform = (name: string) => {
        uniforms.add(name)
        return name
    }

    const useHelper = (helper: Helper) => {
        usedHelpers.add(helper)
    }

    const useFunction = (name: OperationName) => {
        functions.add(name)

        for (const helper of functionHelpers[name] ?? []) {
            usedHelpers.add(helper)
        }
    }

    const sampleBuffer = (buffer: number, frame: Frame, coordinate: string) => {
        const name = `buffer${buffer}${frame === 'current' ? 'Current' : 'Previous'}`
        inputs.set(name, { name, buffer, frame })
        usedHelpers.add('sampleFeedback')
        return declareVariable('vec4', `sampleFeedback(${name}, bufferResolution, ${coordinate})`)
    }

    const sampleMedia = (index: number, coordinate: string) => {
        media.add(index)
        usedHelpers.add('sampleTexture')
        return declareVariable('vec4', `sampleTexture(media${index}, media${index}Size, ${coordinate})`)
    }

    const buildPass = (output: string, target: Target): Pass => {
        const mediaIndexes = Array.from(media)

        const source = [
            '#version 300 es',
            'precision highp float;',
            'const float TAU = 6.283185307179586;',
            'uniform vec2 resolution;',
            'uniform vec2 origin;',
            ...(inputs.size > 0 ? ['uniform vec2 bufferResolution;'] : []),
            ...Array.from(uniforms, (name) => `uniform float ${name};`),
            ...Array.from(inputs.keys(), (name) => `uniform sampler2D ${name};`),
            ...mediaIndexes.flatMap((index) => [`uniform sampler2D media${index};`, `uniform vec2 media${index}Size;`]),
            'out vec4 fragmentColor;',
            ...Array.from(usedHelpers, (helper) => helpers[helper]),
            ...Array.from(functions, (name) => library[name]),
            'void main() {',
            '    vec2 ' + baseCoordinate + ' = (gl_FragCoord.xy - origin - 0.5 * resolution) / min(resolution.x, resolution.y) + 0.5;',
            ...statements.map((statement) => `    ${statement}`),
            '    fragmentColor = ' + output + ';',
            '}',
        ].join('\n')

        return { source, target, inputs: Array.from(inputs.values()), media: mediaIndexes }
    }

    return { addStatement, declareVariable, declareResult, useUniform, useHelper, useFunction, sampleBuffer, sampleMedia, buildPass }
}
