import type { OperationName } from '../operation'

export const vectorParameters: Partial<Record<OperationName, string>> = {
    moveBy: 'rg',
    shiftBy: 'rgb',
}

export const library: Record<OperationName, string> = {
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
vec4 noise(vec2 coordinate, float scale, float phase, float offset) {
    const float loopRadius = 0.5;
    vec2 loop = vec2(cos(phase * TAU), sin(phase * TAU)) * loopRadius;
    float value = simplexNoise(vec4((coordinate - 0.5) * scale, loop + vec2(0.0, offset)));
    return vec4(vec3(value * 0.5 + 0.5), 1.0);
}`,
    voronoi: `
vec4 voronoi(vec2 coordinate, float scale, float phase, float blending) {
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
            point = 0.5 + 0.5 * sin(TAU * (phase + point));
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
vec4 solid(vec2 coordinate, float red, float green, float blue) {
    return vec4(red, green, blue, 1.0);
}`,
    rotate: `
vec2 rotate(vec2 coordinate, float turns) {
    float angle = turns * TAU;
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (coordinate - 0.5) + 0.5;
}`,
    scale: `
vec2 scale(vec2 coordinate, float amount) {
    return (coordinate - 0.5) / amount + 0.5;
}`,
    scaleX: `
vec2 scaleX(vec2 coordinate, float amount) {
    return vec2((coordinate.x - 0.5) / amount + 0.5, coordinate.y);
}`,
    scaleY: `
vec2 scaleY(vec2 coordinate, float amount) {
    return vec2(coordinate.x, (coordinate.y - 0.5) / amount + 0.5);
}`,
    moveX: `
vec2 moveX(vec2 coordinate, float amount) {
    return vec2(coordinate.x - amount, coordinate.y);
}`,
    moveY: `
vec2 moveY(vec2 coordinate, float amount) {
    return vec2(coordinate.x, coordinate.y - amount);
}`,
    move: `
vec2 move(vec2 coordinate, float x, float y) {
    return coordinate - vec2(x, y);
}`,
    moveBy: `
vec2 moveBy(vec2 coordinate, vec2 offset) {
    return coordinate - offset;
}`,
    split: `
vec2 split(float amount) {
    return vec2(amount);
}`,
    splitX: `
vec2 splitX(float amount) {
    return vec2(amount, 0.0);
}`,
    splitY: `
vec2 splitY(float amount) {
    return vec2(0.0, amount);
}`,
    kaleid: `
vec2 kaleid(vec2 coordinate, float sides) {
    vec2 point = coordinate - 0.5;
    float segment = TAU / sides;
    float angle = abs(mod(atan(point.y, point.x), segment) - segment / 2.0);
    return length(point) * vec2(cos(angle), sin(angle)) + 0.5;
}`,
    pixelate: `
vec2 pixelate(vec2 coordinate, float cells) {
    return floor((coordinate - 0.5) * cells + 0.5) / cells + 0.5;
}`,
    pixelateX: `
vec2 pixelateX(vec2 coordinate, float cells) {
    return vec2(floor((coordinate.x - 0.5) * cells + 0.5) / cells + 0.5, coordinate.y);
}`,
    pixelateY: `
vec2 pixelateY(vec2 coordinate, float cells) {
    return vec2(coordinate.x, floor((coordinate.y - 0.5) * cells + 0.5) / cells + 0.5);
}`,
    repeat: `
vec2 repeat(vec2 coordinate, float times) {
    return fract((coordinate - 0.5) * times + 0.5);
}`,
    repeatX: `
vec2 repeatX(vec2 coordinate, float times) {
    return vec2(fract((coordinate.x - 0.5) * times + 0.5), coordinate.y);
}`,
    repeatY: `
vec2 repeatY(vec2 coordinate, float times) {
    return vec2(coordinate.x, fract((coordinate.y - 0.5) * times + 0.5));
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
vec4 shift(vec4 color, float red, float green, float blue) {
    return vec4(color.rgb + fract(vec3(red, green, blue)), color.a);
}`,
    shiftBy: `
vec4 shiftBy(vec4 color, vec3 amount) {
    return vec4(color.rgb + fract(amount), color.a);
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
