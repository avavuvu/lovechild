import type { Definition } from './definition'

export const splits = {
    split: {
        parameters: [{ name: 'x', default: 0.02 }, { name: 'y' }],
        shapes: ['xy'],
        neutral: [0, 0],
        glsl: `
vec2 split(vec2 amount) {
    return amount;
}`,
    },
} satisfies Record<string, Definition>
