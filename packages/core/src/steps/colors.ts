import { encodeChannels } from '../channels'
import type { Definition } from './definition'

export const colors = {
    invert: {
        parameters: [{ name: 'amount', default: 1 }],
        shapes: ['scalar'],
        glsl: `
vec4 invert(vec4 color, float amount) {
    return vec4(mix(color.rgb, 1.0 - color.rgb, amount), color.a);
}`,
    },
    channels: {
        parameters: [{ name: 'order', default: 'rgba' }],
        encode: encodeChannels,
        shapes: ['scalar'],
        glsl: `
vec4 channels(vec4 color, float order) {
    int code = int(order + 0.5);
    int count = code / 256 + 1;
    vec4 result = vec4(color[code % 4], color[(code / 4) % 4], 0.0, 1.0);
    if (count == 1) {
        return vec4(vec3(result.r), 1.0);
    }
    if (count >= 3) {
        result.b = color[(code / 16) % 4];
    }
    if (count == 4) {
        result.a = color[(code / 64) % 4];
    }
    return result;
}`,
    },
    range: {
        parameters: [{ name: 'minimum', default: 0 }, { name: 'maximum', default: 1 }],
        shapes: ['scalar', 'scalar'],
        glsl: `
vec4 range(vec4 color, float minimum, float maximum) {
    return vec4(color.rgb * (maximum - minimum) + minimum, color.a);
}`,
    },
    brightness: {
        parameters: [{ name: 'amount', default: 0.4 }],
        shapes: ['scalar'],
        glsl: `
vec4 brightness(vec4 color, float amount) {
    return vec4(color.rgb + amount, color.a);
}`,
    },
    contrast: {
        parameters: [{ name: 'amount', default: 1.6 }],
        shapes: ['scalar'],
        glsl: `
vec4 contrast(vec4 color, float amount) {
    return vec4((color.rgb - 0.5) * amount + 0.5, color.a);
}`,
    },
    saturate: {
        parameters: [{ name: 'amount', default: 2 }],
        shapes: ['scalar'],
        helpers: ['luminance'],
        glsl: `
vec4 saturate(vec4 color, float amount) {
    return vec4(mix(vec3(luminance(color)), color.rgb, amount), color.a);
}`,
    },
    hue: {
        parameters: [{ name: 'turns', default: 0.4 }],
        shapes: ['scalar'],
        helpers: ['hsv'],
        glsl: `
vec4 hue(vec4 color, float turns) {
    vec3 hsv = rgbToHsv(color.rgb);
    hsv.x += turns;
    return vec4(hsvToRgb(hsv), color.a);
}`,
    },
    colorama: {
        parameters: [{ name: 'amount', default: 0.005 }],
        shapes: ['scalar'],
        helpers: ['hsv'],
        glsl: `
vec4 colorama(vec4 color, float amount) {
    vec3 hsv = rgbToHsv(color.rgb) + amount;
    return vec4(fract(hsvToRgb(hsv)), color.a);
}`,
    },
    shift: {
        parameters: [{ name: 'red', default: 0.5 }, { name: 'green' }, { name: 'blue' }],
        shapes: ['rgb'],
        neutral: [0, 0, 0],
        glsl: `
vec4 shift(vec4 color, vec3 amount) {
    return vec4(color.rgb + fract(amount), color.a);
}`,
    },
    grey: {
        parameters: [],
        shapes: [],
        helpers: ['luminance'],
        glsl: `
vec4 grey(vec4 color) {
    return vec4(vec3(luminance(color)), color.a);
}`,
    },
    posterize: {
        parameters: [{ name: 'levels', default: 3 }],
        shapes: ['scalar'],
        glsl: `
vec4 posterize(vec4 color, float levels) {
    const float gamma = 0.6;
    vec3 adjusted = floor(pow(color.rgb, vec3(gamma)) * levels) / levels;
    return vec4(pow(adjusted, vec3(1.0 / gamma)), color.a);
}`,
    },
    abs: {
        parameters: [],
        shapes: [],
        functionName: 'absStep',
        glsl: `
vec4 absStep(vec4 color) {
    return vec4(abs(color.rgb), color.a);
}`,
    },
    fract: {
        parameters: [],
        shapes: [],
        functionName: 'fractStep',
        glsl: `
vec4 fractStep(vec4 color) {
    return vec4(fract(color.rgb), color.a);
}`,
    },
    smoothstep: {
        parameters: [{ name: 'start', default: 0 }, { name: 'end', default: 1 }],
        shapes: ['scalar', 'scalar'],
        functionName: 'smoothstepStep',
        glsl: `
vec4 smoothstepStep(vec4 color, float start, float end) {
    return vec4(smoothstep(start, end, color.rgb), color.a);
}`,
    },
    thresh: {
        parameters: [{ name: 'threshold', default: 0.5 }],
        shapes: ['scalar'],
        helpers: ['luminance'],
        glsl: `
vec4 thresh(vec4 color, float threshold) {
    const float tolerance = 0.04;
    return vec4(vec3(smoothstep(threshold - tolerance, threshold + tolerance, luminance(color))), color.a);
}`,
    },
    luma: {
        parameters: [{ name: 'threshold', default: 0.5 }],
        shapes: ['scalar'],
        helpers: ['luminance'],
        glsl: `
vec4 luma(vec4 color, float threshold) {
    const float tolerance = 0.1;
    float amount = smoothstep(threshold - tolerance, threshold + tolerance, luminance(color));
    return vec4(color.rgb * amount, amount);
}`,
    },
} satisfies Record<string, Definition>
