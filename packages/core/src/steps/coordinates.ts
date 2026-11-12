import type { Definition } from './definition'

export const coordinates = {
    rotate: {
        parameters: [{ name: 'turns', default: 0.125 }],
        shapes: ['scalar'],
        glsl: `
vec2 rotate(vec2 coordinate, float turns) {
    float angle = turns * TAU;
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (coordinate - 0.5) + 0.5;
}`,
    },
    scale: {
        parameters: [{ name: 'x', default: 1.5 }, { name: 'y' }],
        shapes: ['xy'],
        neutral: [1, 1],
        glsl: `
vec2 scale(vec2 coordinate, vec2 amount) {
    return (coordinate - 0.5) / amount + 0.5;
}`,
    },
    move: {
        parameters: [{ name: 'x', default: 0.5 }, { name: 'y' }],
        shapes: ['xy'],
        neutral: [0, 0],
        glsl: `
vec2 move(vec2 coordinate, vec2 offset) {
    return coordinate - offset;
}`,
    },
    scroll: {
        parameters: [{ name: 'x', default: 0.1 }, { name: 'y' }],
        shapes: ['xy'],
        neutral: [0, 0],
        glsl: `
vec2 scroll(vec2 coordinate, vec2 speed) {
    return coordinate - speed * time;
}`,
    },
    spin: {
        parameters: [{ name: 'speed', default: 0.1 }],
        shapes: ['scalar'],
        glsl: `
vec2 spin(vec2 coordinate, float speed) {
    float angle = fract(speed * time) * TAU;
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (coordinate - 0.5) + 0.5;
}`,
    },
    kaleid: {
        parameters: [{ name: 'sides', default: 4 }],
        shapes: ['scalar'],
        glsl: `
vec2 kaleid(vec2 coordinate, float sides) {
    vec2 point = coordinate - 0.5;
    float segment = TAU / sides;
    float angle = abs(mod(atan(point.y, point.x), segment) - segment / 2.0);
    return length(point) * vec2(cos(angle), sin(angle)) + 0.5;
}`,
    },
    pixelate: {
        parameters: [{ name: 'x', default: 20 }, { name: 'y' }],
        shapes: ['xy'],
        neutral: [0, 0],
        glsl: `
vec2 pixelate(vec2 coordinate, vec2 cells) {
    vec2 safe = max(cells, 0.0001);
    vec2 pixelated = floor((coordinate - 0.5) * safe + 0.5) / safe + 0.5;
    return mix(coordinate, pixelated, step(0.0001, cells));
}`,
    },
    repeat: {
        parameters: [{ name: 'x', default: 3 }, { name: 'y' }],
        shapes: ['xy'],
        neutral: [0, 0],
        glsl: `
vec2 repeat(vec2 coordinate, vec2 times) {
    vec2 repeated = fract((coordinate - 0.5) * times + 0.5);
    return mix(coordinate, repeated, step(0.0001, times));
}`,
    },
} satisfies Record<string, Definition>
