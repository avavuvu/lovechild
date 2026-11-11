import type { OperationName } from '../operation'
import { stepKinds, stepShapes, type Shape, type StepKind } from '../steps'

export const library: Record<OperationName, string> = {
    paint: `
vec4 paint(vec2 coordinate, float red, float green, float blue, float alpha) {
    return vec4(red, green, blue, alpha);
}`,
    osc: `
vec4 osc(vec2 coordinate, float frequency, float phase) {
    float value = sin((coordinate.x * frequency + phase) * TAU) * 0.5 + 0.5;
    return vec4(vec3(value), 1.0);
}`,
    shape: `
vec4 shape(vec2 coordinate, float sides) {
    vec2 point = coordinate * 2.0 - 1.0;
    float angle = atan(point.x, point.y) + TAU / 2.0;
    float segment = TAU / sides;
    float edge = cos(floor(0.5 + angle / segment) * segment - angle) * length(point);
    return vec4(vec3(1.0 - smoothstep(1.0, 1.01, edge)), 1.0);
}`,
    noise: `
vec4 noise(vec2 coordinate, float scale, float speed) {
    float value = simplexNoise(vec4((coordinate - 0.5) * scale, 0.5, speed * time));
    return vec4(vec3(value * 0.5 + 0.5), 1.0);
}`,
    simplex: `
vec4 simplex(vec2 coordinate, float scale, float phase, float offset) {
    const float loopRadius = 0.5;
    vec2 loop = vec2(cos(phase * TAU), sin(phase * TAU)) * loopRadius;
    float value = simplexNoise(vec4((coordinate - 0.5) * scale, loop + vec2(0.0, offset)));
    return vec4(vec3(value * 0.5 + 0.5), 1.0);
}`,
    voronoi: `
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
    gradient: `
vec4 gradient(vec2 coordinate) {
    return vec4(coordinate, 0.0, 1.0);
}`,
    empty: `
vec4 empty(vec2 coordinate) {
    return vec4(0.0);
}`,
    solid: `
vec4 solid(vec2 coordinate, vec4 color) {
    return color;
}`,
    hsv: `
vec4 hsv(vec2 coordinate, float hue, float saturation, float value, float alpha) {
    return vec4(hsvToRgb(vec3(hue, saturation, value)), alpha);
}`,
    oklch: `
vec4 oklch(vec2 coordinate, float lightness, float chroma, float hue, float alpha) {
    float scaled = chroma * 0.4;
    return vec4(oklabToRgb(vec3(lightness, scaled * cos(hue * TAU), scaled * sin(hue * TAU))), alpha);
}`,
    rotate: `
vec2 rotate(vec2 coordinate, float turns) {
    float angle = turns * TAU;
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (coordinate - 0.5) + 0.5;
}`,
    scale: `
vec2 scale(vec2 coordinate, vec2 amount) {
    return (coordinate - 0.5) / amount + 0.5;
}`,
    move: `
vec2 move(vec2 coordinate, vec2 offset) {
    return coordinate - offset;
}`,
    split: `
vec2 split(vec2 amount) {
    return amount;
}`,
    kaleid: `
vec2 kaleid(vec2 coordinate, float sides) {
    vec2 point = coordinate - 0.5;
    float segment = TAU / sides;
    float angle = abs(mod(atan(point.y, point.x), segment) - segment / 2.0);
    return length(point) * vec2(cos(angle), sin(angle)) + 0.5;
}`,
    pixelate: `
vec2 pixelate(vec2 coordinate, vec2 cells) {
    vec2 safe = max(cells, 0.0001);
    vec2 pixelated = floor((coordinate - 0.5) * safe + 0.5) / safe + 0.5;
    return mix(coordinate, pixelated, step(0.0001, cells));
}`,
    repeat: `
vec2 repeat(vec2 coordinate, vec2 times) {
    vec2 repeated = fract((coordinate - 0.5) * times + 0.5);
    return mix(coordinate, repeated, step(0.0001, times));
}`,
    invert: `
vec4 invert(vec4 color, float amount) {
    return vec4(mix(color.rgb, 1.0 - color.rgb, amount), color.a);
}`,
    range: `
vec4 range(vec4 color, float minimum, float maximum) {
    return vec4(color.rgb * (maximum - minimum) + minimum, color.a);
}`,
    brightness: `
vec4 brightness(vec4 color, float amount) {
    return vec4(color.rgb + amount, color.a);
}`,
    contrast: `
vec4 contrast(vec4 color, float amount) {
    return vec4((color.rgb - 0.5) * amount + 0.5, color.a);
}`,
    saturate: `
vec4 saturate(vec4 color, float amount) {
    return vec4(mix(vec3(luminance(color)), color.rgb, amount), color.a);
}`,
    hue: `
vec4 hue(vec4 color, float turns) {
    vec3 hsv = rgbToHsv(color.rgb);
    hsv.x += turns;
    return vec4(hsvToRgb(hsv), color.a);
}`,
    colorama: `
vec4 colorama(vec4 color, float amount) {
    vec3 hsv = rgbToHsv(color.rgb) + amount;
    return vec4(fract(hsvToRgb(hsv)), color.a);
}`,
    shift: `
vec4 shift(vec4 color, vec3 amount) {
    return vec4(color.rgb + fract(amount), color.a);
}`,
    grey: `
vec4 grey(vec4 color) {
    return vec4(vec3(luminance(color)), color.a);
}`,
    posterize: `
vec4 posterize(vec4 color, float levels) {
    const float gamma = 0.6;
    vec3 adjusted = floor(pow(color.rgb, vec3(gamma)) * levels) / levels;
    return vec4(pow(adjusted, vec3(1.0 / gamma)), color.a);
}`,
    thresh: `
vec4 thresh(vec4 color, float threshold) {
    const float tolerance = 0.04;
    return vec4(vec3(smoothstep(threshold - tolerance, threshold + tolerance, luminance(color))), color.a);
}`,
    luma: `
vec4 luma(vec4 color, float threshold) {
    const float tolerance = 0.1;
    float amount = smoothstep(threshold - tolerance, threshold + tolerance, luminance(color));
    return vec4(color.rgb * amount, amount);
}`,
    channels: `
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
    add: `
vec4 add(vec4 color, vec4 other) {
    return color + other;
}`,
    sub: `
vec4 sub(vec4 color, vec4 other) {
    return color - other;
}`,
    mult: `
vec4 mult(vec4 color, vec4 other) {
    return color * other;
}`,
    diff: `
vec4 diff(vec4 color, vec4 other) {
    return vec4(abs(color.rgb - other.rgb), max(color.a, other.a));
}`,
    layer: `
vec4 layer(vec4 color, vec4 other) {
    return vec4(mix(color.rgb, other.rgb, other.a), clamp(color.a + other.a, 0.0, 1.0));
}`,
    mask: `
vec4 mask(vec4 color, vec4 other) {
    float amount = dot(other.rgb, vec3(0.2125, 0.7154, 0.0721));
    return vec4(color.rgb * amount, color.a * amount);
}`,
    screen: `
vec4 screen(vec4 color, vec4 other) {
    return 1.0 - (1.0 - color) * (1.0 - other);
}`,
    blend: `
vec4 blend(vec4 color, vec4 other, float amount) {
    return mix(color, other, amount);
}`,
}

const inputTypes: Record<StepKind, ReadonlyArray<string>> = {
    source: ['vec2'],
    coordinate: ['vec2'],
    color: ['vec4'],
    combine: ['vec4', 'vec4'],
    split: [],
}

const shapeTypes: Record<Shape, string> = { scalar: 'float', xy: 'vec2', rgb: 'vec3', rgba: 'vec4' }

const readSignature = (name: string, source: string) => {
    const parameters = new RegExp(`\\b${name}\\(([^)]*)\\)\\s*\\{`).exec(source)?.[1] ?? ''
    return parameters.split(',').map((parameter) => parameter.trim().split(/\s+/)[0]).filter((type) => type !== '')
}

for (const [name, source] of Object.entries(library)) {
    const kind = stepKinds.get(name) ?? 'source'
    const expected = [...inputTypes[kind], ...stepShapes[name as OperationName].map((shape) => shapeTypes[shape])]
    const actual = readSignature(name, source)

    if (expected.join(',') !== actual.join(',')) {
        throw new Error(`${name} shader takes (${actual.join(', ')}) but its parameters need (${expected.join(', ')})`)
    }
}
