import type { Definition, Shape, StepKind } from './definition'

const inputTypes: Record<StepKind, ReadonlyArray<string>> = {
    source: ['vec2'],
    coordinate: ['vec2'],
    color: ['vec4'],
    combine: ['vec4', 'vec4'],
    split: [],
}

const shapeTypes: Record<Shape, string> = { scalar: 'float', xy: 'vec2', rgb: 'vec3', rgba: 'vec4' }

const shapeSizes: Record<Shape, number> = { scalar: 1, xy: 2, rgb: 3, rgba: 4 }

const readSignature = (name: string, glsl: string) => {
    const parameters = new RegExp(`\\b${name}\\(([^)]*)\\)\\s*\\{`).exec(glsl)?.[1] ?? ''
    return parameters.split(',').map((parameter) => parameter.trim().split(/\s+/)[0]).filter((type) => type !== '')
}

export const checkSignatures = (kind: StepKind, group: Record<string, Definition>) => {
    for (const [name, definition] of Object.entries(group)) {
        const expected = [...inputTypes[kind], ...definition.shapes.map((shape) => shapeTypes[shape])]
        const actual = readSignature(definition.functionName ?? name, definition.glsl)
        const size = definition.shapes.reduce((total, shape) => total + shapeSizes[shape], 0)

        if (definition.parameters.length !== size) {
            throw new Error(`${name} has ${definition.parameters.length} parameters but its shapes need ${size}`)
        }

        if (expected.join(',') !== actual.join(',')) {
            throw new Error(`${name} shader takes (${actual.join(', ')}) but its parameters need (${expected.join(', ')})`)
        }
    }
}
