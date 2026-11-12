export type Helper = 'sampleTexture' | 'sampleFeedback' | 'paintText' | 'luminance' | 'hsv' | 'oklab' | 'simplexNoise'

export const helpers: Record<Helper, string> = {
    sampleTexture: `
vec4 sampleTexture(sampler2D image, vec2 size, vec2 coordinate) {
    vec2 position = (coordinate - 0.5) * min(size.x, size.y) / size + 0.5;
    if (any(lessThan(position, vec2(0.0))) || any(greaterThan(position, vec2(1.0)))) {
        return vec4(0.0);
    }
    return texture(image, position);
}`,
    sampleFeedback: `
vec4 sampleFeedback(sampler2D image, vec2 size, vec2 coordinate) {
    vec2 position = (coordinate - 0.5) * min(size.x, size.y) / size + 0.5;
    return texture(image, fract(position));
}`,
    paintText: `
vec4 paintText(vec4 mask, vec4 fill, vec4 stroke) {
    float fillAmount = mask.r * fill.a;
    float strokeAmount = mask.g * stroke.a;
    float alpha = fillAmount + strokeAmount;
    return alpha > 0.0 ? vec4((fill.rgb * fillAmount + stroke.rgb * strokeAmount) / alpha, alpha) : vec4(0.0);
}`,
    luminance: `
float luminance(vec4 color) {
    return dot(color.rgb, vec3(0.2125, 0.7154, 0.0721));
}`,
    oklab: `
vec3 oklabToRgb(vec3 color) {
    float l = color.x + 0.3963377774 * color.y + 0.2158037573 * color.z;
    float m = color.x - 0.1055613458 * color.y - 0.0638541728 * color.z;
    float s = color.x - 0.0894841775 * color.y - 1.2914855480 * color.z;
    vec3 cone = vec3(l * l * l, m * m * m, s * s * s);
    vec3 linear = clamp(vec3(
        4.0767416621 * cone.x - 3.3077115913 * cone.y + 0.2309699292 * cone.z,
        -1.2684380046 * cone.x + 2.6097574011 * cone.y - 0.3413193965 * cone.z,
        -0.0041960863 * cone.x - 0.7034186147 * cone.y + 1.7076147010 * cone.z
    ), 0.0, 1.0);
    return mix(12.92 * linear, 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, linear));
}`,
    hsv: `
vec3 rgbToHsv(vec3 color) {
    vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(color.bg, k.wz), vec4(color.gb, k.xy), step(color.b, color.g));
    vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsvToRgb(vec3 color) {
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(color.xxx + k.xyz) * 6.0 - k.www);
    return color.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), color.y);
}`,
    simplexNoise: `
// Simplex 4D noise by Ian McEwan, Ashima Arts. Copyright (C) 2011 Ashima Arts. Distributed under the MIT License. https://github.com/ashima/webgl-noise
vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 10.0) * x);
}
float permute(float x) {
    return mod289(((x * 34.0) + 10.0) * x);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}
float taylorInvSqrt(float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p;
    vec4 s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}
float simplexNoise(vec4 v) {
    const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
    const float F4 = 0.309016994374947451;
    vec4 i = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    i = mod289(i);
    float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute(permute(permute(permute(
        i.w + vec4(i1.w, i2.w, i3.w, 1.0))
        + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
        + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
        + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0, ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2))) + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4))));
}`,
}
