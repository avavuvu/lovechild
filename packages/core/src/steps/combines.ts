import type { Definition } from './definition'

export const combines = {
    add: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 add(vec4 color, vec4 other) {
    return color + other;
}`,
    },
    sub: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 sub(vec4 color, vec4 other) {
    return color - other;
}`,
    },
    mult: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 mult(vec4 color, vec4 other) {
    return color * other;
}`,
    },
    div: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 div(vec4 color, vec4 other) {
    return color / other;
}`,
    },
    min: {
        parameters: [],
        shapes: [],
        functionName: 'minStep',
        glsl: `
vec4 minStep(vec4 color, vec4 other) {
    return min(color, other);
}`,
    },
    max: {
        parameters: [],
        shapes: [],
        functionName: 'maxStep',
        glsl: `
vec4 maxStep(vec4 color, vec4 other) {
    return max(color, other);
}`,
    },
    pow: {
        parameters: [],
        shapes: [],
        functionName: 'powStep',
        glsl: `
vec4 powStep(vec4 color, vec4 other) {
    return pow(max(color, 0.0), other);
}`,
    },
    mod: {
        parameters: [],
        shapes: [],
        functionName: 'modStep',
        glsl: `
vec4 modStep(vec4 color, vec4 other) {
    return vec4(mod(color.rgb, other.rgb), color.a);
}`,
    },
    diff: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 diff(vec4 color, vec4 other) {
    return vec4(abs(color.rgb - other.rgb), max(color.a, other.a));
}`,
    },
    layer: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 layer(vec4 color, vec4 other) {
    return vec4(mix(color.rgb, other.rgb, other.a), clamp(color.a + other.a, 0.0, 1.0));
}`,
    },
    mask: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 mask(vec4 color, vec4 other) {
    float amount = dot(other.rgb, vec3(0.2125, 0.7154, 0.0721));
    return vec4(color.rgb * amount, color.a * amount);
}`,
    },
    blend: {
        parameters: [{ name: 'amount', default: 0.5 }],
        shapes: ['scalar'],
        glsl: `
vec4 blend(vec4 color, vec4 other, float amount) {
    return mix(color, other, amount);
}`,
    },
    screen: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 screen(vec4 color, vec4 other) {
    return 1.0 - (1.0 - color) * (1.0 - other);
}`,
    },
} satisfies Record<string, Definition>
