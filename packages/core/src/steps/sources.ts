import type { Definition } from './definition'

export const sources = {
    osc: {
        parameters: [{ name: 'frequency', default: 10 }, { name: 'phase', default: 0 }],
        shapes: ['scalar', 'scalar'],
        glsl: `
vec4 osc(vec2 coordinate, float frequency, float phase) {
    float value = sin((coordinate.x * frequency + phase) * TAU) * 0.5 + 0.5;
    return vec4(vec3(value), 1.0);
}`,
    },
    shape: {
        parameters: [{ name: 'sides', default: 3 }],
        shapes: ['scalar'],
        glsl: `
vec4 shape(vec2 coordinate, float sides) {
    vec2 point = coordinate * 2.0 - 1.0;
    float angle = atan(point.x, point.y) + TAU / 2.0;
    float segment = TAU / sides;
    float edge = cos(floor(0.5 + angle / segment) * segment - angle) * length(point);
    return vec4(vec3(1.0 - smoothstep(1.0, 1.01, edge)), 1.0);
}`,
    },
    solid: {
        parameters: [{ name: 'red' }, { name: 'green' }, { name: 'blue' }, { name: 'alpha' }],
        shapes: ['rgba'],
        neutral: [0, 0, 0, 1],
        glsl: `
vec4 solid(vec2 coordinate, vec4 color) {
    return color;
}`,
    },
    noise: {
        parameters: [{ name: 'scale', default: 10 }, { name: 'speed', default: 0.2 }],
        shapes: ['scalar', 'scalar'],
        helpers: ['simplexNoise'],
        glsl: `
vec4 noise(vec2 coordinate, float scale, float speed) {
    float value = simplexNoise(vec4((coordinate - 0.5) * scale, 0.5, speed * time));
    return vec4(vec3(value * 0.5 + 0.5), 1.0);
}`,
    },
    simplex: {
        parameters: [{ name: 'scale', default: 10 }, { name: 'phase', default: 0 }, { name: 'offset', default: 0 }],
        shapes: ['scalar', 'scalar', 'scalar'],
        helpers: ['simplexNoise'],
        glsl: `
vec4 simplex(vec2 coordinate, float scale, float phase, float offset) {
    const float loopRadius = 0.5;
    vec2 loop = vec2(cos(phase * TAU), sin(phase * TAU)) * loopRadius;
    float value = simplexNoise(vec4((coordinate - 0.5) * scale, loop + vec2(0.0, offset)));
    return vec4(vec3(value * 0.5 + 0.5), 1.0);
}`,
    },
    voronoi: {
        parameters: [{ name: 'scale', default: 5 }, { name: 'speed', default: 0.1 }, { name: 'blending', default: 0.3 }],
        shapes: ['scalar', 'scalar', 'scalar'],
        glsl: `
vec4 voronoi(vec2 coordinate, float scale, float speed, float blending) {
    vec2 scaled = (coordinate - 0.5) * scale;
    vec2 cell = floor(scaled);
    vec2 position = fract(scaled);
    float closestDistance = 10.0;
    vec2 closestPoint = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 seed = cell + neighbor;
            vec2 point = fract(sin(vec2(dot(seed, vec2(127.1, 311.7)), dot(seed, vec2(269.5, 183.3)))) * 43758.5453);
            point = 0.5 + 0.5 * sin(TAU * (speed * time + point));
            float separation = length(neighbor + point - position);
            if (separation < closestDistance) {
                closestDistance = separation;
                closestPoint = point;
            }
        }
    }
    float value = dot(closestPoint, vec2(0.3, 0.6)) * (1.0 - blending * closestDistance);
    return vec4(vec3(value), 1.0);
}`,
    },
    gradient: {
        parameters: [],
        shapes: [],
        glsl: `
vec4 gradient(vec2 coordinate) {
    return vec4(coordinate, 0.0, 1.0);
}`,
    },
    empty: {
        parameters: [],
        isInternal: true,
        shapes: [],
        glsl: `
vec4 empty(vec2 coordinate) {
    return vec4(0.0);
}`,
    },
    paint: {
        parameters: [{ name: 'red' }, { name: 'green' }, { name: 'blue' }, { name: 'alpha' }],
        hasColorChannels: true,
        isInternal: true,
        shapes: ['scalar', 'scalar', 'scalar', 'scalar'],
        glsl: `
vec4 paint(vec2 coordinate, float red, float green, float blue, float alpha) {
    return vec4(red, green, blue, alpha);
}`,
    },
    hsv: {
        parameters: [{ name: 'hue', default: 0 }, { name: 'saturation', default: 1 }, { name: 'value', default: 1 }, { name: 'alpha', default: 1 }],
        shapes: ['scalar', 'scalar', 'scalar', 'scalar'],
        helpers: ['hsv'],
        glsl: `
vec4 hsv(vec2 coordinate, float hue, float saturation, float value, float alpha) {
    return vec4(hsvToRgb(vec3(hue, saturation, value)), alpha);
}`,
    },
    oklch: {
        parameters: [{ name: 'lightness', default: 0.7 }, { name: 'chroma', default: 0.5 }, { name: 'hue', default: 0 }, { name: 'alpha', default: 1 }],
        shapes: ['scalar', 'scalar', 'scalar', 'scalar'],
        helpers: ['oklab'],
        glsl: `
vec4 oklch(vec2 coordinate, float lightness, float chroma, float hue, float alpha) {
    float scaled = chroma * 0.4;
    return vec4(oklabToRgb(vec3(lightness, scaled * cos(hue * TAU), scaled * sin(hue * TAU))), alpha);
}`,
    },
} satisfies Record<string, Definition>
