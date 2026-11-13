@group(0) @binding(0) var<uniform> controls: vec4f;

const PI = 3.14159265;
const BACKGROUND = vec3f(0.018, 0.030, 0.050);

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vsMain(@builtin(vertex_index) index: u32) -> VertexOutput {
    let positions = array(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
    let p = positions[index];
    return VertexOutput(vec4f(p, 0.0, 1.0), p * 0.5 + 0.5);
}

fn toSrgb(linear: vec3f) -> vec3f {
    let c = clamp(linear, vec3f(0.0), vec3f(1.0));
    return select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, c * 12.92, c <= vec3f(0.0031308));
}

fn reinhard(x: vec3f) -> vec3f {
    return x / (vec3f(1.0) + x);
}

fn sphereNormal(p: vec2f) -> vec3f {
    return vec3f(p, sqrt(max(0.0, 1.0 - dot(p, p))));
}

fn normalMapPreview(p: vec2f, strength: f32, degrees: f32) -> vec3f {
    if (dot(p, p) >= 1.0) { return BACKGROUND; }
    let n = sphereNormal(p);
    let tangent = normalize(vec3f(n.z, 0.0, -n.x));
    let bitangent = cross(n, tangent);
    let grid = p * 32.0;
    let detail = normalize(vec3f(strength * cos(grid.x) * sin(grid.y),
                                strength * sin(grid.x) * cos(grid.y), 1.0));
    let shadedNormal = mat3x3f(tangent, bitangent, n) * detail;
    let angle = degrees * PI / 180.0;
    let l = normalize(vec3f(sin(angle), 0.35, cos(angle)));
    return vec3f(0.23, 0.53, 0.78) * (0.09 + 0.85 * max(dot(shadedNormal, l), 0.0));
}

fn smithG1(cosine: f32, alphaSquared: f32) -> f32 {
    return 2.0 * cosine /
        (cosine + sqrt(alphaSquared + (1.0 - alphaSquared) * cosine * cosine));
}

fn ggxPreview(p: vec2f, roughness: f32, metal: f32) -> vec3f {
    if (dot(p, p) >= 1.0) { return BACKGROUND; }
    let n = sphereNormal(p);
    let v = vec3f(0.0, 0.0, 1.0);
    let l = normalize(vec3f(-0.5, 0.65, 0.75));
    let h = normalize(v + l);
    let nl = max(dot(n, l), 0.0);
    let nv = max(n.z, 0.0001);
    let nh = max(dot(n, h), 0.0);
    let vh = clamp(dot(v, h), 0.0, 1.0);
    let alpha = roughness * roughness;
    let a2 = alpha * alpha;
    let denominator = nh * nh * (a2 - 1.0) + 1.0;
    let d = a2 / (PI * denominator * denominator);
    let g = smithG1(nl, a2) * smithG1(nv, a2);
    let base = vec3f(0.75, 0.24, 0.07);
    let f0 = mix(vec3f(0.04), base, metal);
    let f = f0 + (vec3f(1.0) - f0) * pow(1.0 - vh, 5.0);
    let specular = d * g * f / max(4.0 * nl * nv, 0.0001);
    let diffuse = (vec3f(1.0) - f) * (1.0 - metal) * base / PI;
    return reinhard(vec3f(0.014) + (diffuse + specular) * nl * 5.0);
}

fn hdrPreview(p: vec2f, exposure: f32, intensity: f32) -> vec3f {
    let x = select(p.x + controls.w * 0.5, p.x - controls.w * 0.5, p.x >= 0.0);
    let d = length(vec2f(x, p.y - 0.12));
    let emitter = exp(-7.0 * d * d) * intensity;
    let grid = 0.08 + 0.04 * cos(x * 30.0) * cos(p.y * 28.0);
    let c = (vec3f(grid * 0.6, grid, grid * 1.4) +
        vec3f(1.0, 0.63, 0.23) * emitter) * exp2(exposure);
    return select(min(c, vec3f(1.0)), reinhard(c), p.x >= 0.0);
}

fn hash(cell: vec2i) -> f32 {
    var bits = (bitcast<u32>(cell.x) * 0x8da6b343u) ^ (bitcast<u32>(cell.y) * 0xd8163841u);
    bits = (bits ^ (bits >> 16u)) * 0x7feb352du;
    bits = (bits ^ (bits >> 15u)) * 0x846ca68bu;
    bits = bits ^ (bits >> 16u);
    return f32(bits & 0x00ffffffu) / 16777215.0;
}

fn valueNoise(p: vec2f) -> f32 {
    let i = vec2i(floor(p));
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2i(1, 0)), u.x),
               mix(hash(i + vec2i(0, 1)), hash(i + vec2i(1, 1)), u.x), u.y);
}

fn fbm(p: vec2f, octaves: u32) -> f32 {
    var q = p;
    var weight = 1.0;
    var weightSum = 0.0;
    var sum = 0.0;
    for (var i = 0u; i < octaves; i++) {
        sum += valueNoise(q) * weight;
        weightSum += weight;
        weight *= 0.55;
        q = q * 2.0 + vec2f(5.17, 9.23);
    }
    return sum / weightSum;
}

fn noisePreview(p: vec2f, octaves: u32, warp: f32) -> vec3f {
    let x = select(p.x + controls.w * 0.5, p.x - controls.w * 0.5, p.x >= 0.0);
    let q = vec2f(x, p.y) * 4.0;
    let offset = vec2f(fbm(q + vec2f(8.1, 3.7), octaves),
                       fbm(q + vec2f(-6.9, 15.8), octaves)) - 0.5;
    let c = fbm(q + offset * select(0.0, warp, p.x >= 0.0), octaves);
    return mix(vec3f(0.018, 0.065, 0.12), vec3f(0.38, 0.83, 0.65), smoothstep(0.17, 0.83, c));
}

fn toonPreview(p: vec2f, bands: f32, rimStrength: f32) -> vec3f {
    if (dot(p, p) >= 1.0) { return BACKGROUND; }
    let n = sphereNormal(p);
    let diffuse = max(dot(n, normalize(vec3f(-0.5, 0.75, 0.6))), 0.0);
    let tone = min(bands - 1.0, floor(diffuse * bands)) / (bands - 1.0);
    let rim = smoothstep(0.43, 0.91, 1.0 - n.z) * rimStrength;
    return mix(vec3f(0.13, 0.045, 0.29), vec3f(0.83, 0.32, 0.22), tone) +
           vec3f(0.35, 0.62, 0.8) * rim;
}

fn shapeDistance(p: vec3f, width: f32) -> f32 {
    let a = length(p - vec3f(-0.46, 0.64, 0.03)) - 0.59;
    let b = length(p - vec3f(0.46, 0.65, -0.03)) - 0.56;
    if (width < 0.0001) { return min(a, b); }
    let t = max(width - abs(a - b), 0.0) / width;
    return min(a, b) - t * t * width * 0.25;
}

fn sceneDistance(p: vec3f, width: f32) -> f32 {
    return min(p.y, shapeDistance(p, width));
}

fn sdfNormal(p: vec3f, width: f32) -> vec3f {
    let x = vec3f(0.001, 0.0, 0.0);
    let y = vec3f(0.0, 0.001, 0.0);
    let z = vec3f(0.0, 0.0, 0.001);
    return normalize(vec3f(sceneDistance(p + x, width) - sceneDistance(p - x, width),
                           sceneDistance(p + y, width) - sceneDistance(p - y, width),
                           sceneDistance(p + z, width) - sceneDistance(p - z, width)));
}

fn softShadow(p: vec3f, l: vec3f, width: f32, hardness: f32) -> f32 {
    var visibility = 1.0;
    var t = 0.025;
    for (var i = 0; i < 40; i++) {
        let d = shapeDistance(p + t * l, width);
        if (d < 0.001) { return 0.0; }
        visibility = min(visibility, hardness * d / t);
        t += clamp(d, 0.01, 0.30);
        if (t > 4.0) { break; }
    }
    return visibility;
}

fn sdfPreview(p: vec2f, width: f32, hardness: f32) -> vec3f {
    let eye = vec3f(0.0, 1.65, 3.3);
    let rd = normalize(vec3f(p.x * 0.40, p.y * 0.40 - 0.30, -1.0));
    var t = 0.0;
    for (var i = 0; i < 88; i++) {
        let point = eye + t * rd;
        let d = sceneDistance(point, width);
        if (d < 0.001) {
            let n = sdfNormal(point, width);
            let l = normalize(vec3f(-0.75, 0.58, 0.44));
            let shadow = softShadow(point + n * 0.006, l, width, hardness);
            let base = select(vec3f(0.16, 0.62, 0.57), vec3f(0.30, 0.34, 0.38), point.y < 0.003);
            let color = base * (0.12 + 0.88 * max(dot(n, l), 0.0) * shadow);
            return mix(color, BACKGROUND, smoothstep(6.0, 14.0, t));
        }
        t += d;
        if (t > 14.0) { break; }
    }
    return BACKGROUND;
}

fn waterPreview(p: vec2f, wave: f32, absorption: f32) -> vec3f {
    let view = normalize(vec3f(-p.x * 0.32, 0.13 + 0.35 * (1.0 - p.y), 1.0));
    let d1 = normalize(vec2f(0.8, 0.6));
    let d2 = normalize(vec2f(-0.5, 1.0));
    let slope = 0.43 * cos(dot(p, d1) * 17.0) * d1 + 0.25 * cos(dot(p, d2) * 26.0) * d2;
    let n = normalize(vec3f(-slope.x * wave, 1.0, -slope.y * wave));
    let reflection = reflect(-view, n);
    let transmission = refract(-view, n, 1.0 / 1.333);
    let depth = mix(0.2, 2.4, smoothstep(-0.9, 0.9, p.x));
    let lengthInWater = depth / max(0.15, -transmission.y);
    let bedUv = p + transmission.xz * lengthInWater * 0.24;
    let tiles = 0.68 + 0.25 * sin(bedUv.x * 23.0) * sin(bedUv.y * 23.0);
    let throughput = exp(-vec3f(1.3, 0.45, 0.22) * absorption * lengthInWater);
    let bed = vec3f(0.62, 0.48, 0.30) * tiles;
    let body = bed * throughput + vec3f(0.012, 0.10, 0.15) * (1.0 - throughput);
    let sky = mix(vec3f(0.66, 0.78, 0.84), vec3f(0.12, 0.32, 0.59), clamp(reflection.y, 0.0, 1.0));
    let glint = pow(max(dot(reflection, normalize(vec3f(-0.4, 0.51, -0.76))), 0.0), 90.0);
    let fresnel = 0.0204 + 0.9796 * pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 5.0);
    return mix(body, sky + glint * vec3f(1.0, 0.9, 0.65), fresnel);
}

@fragment
fn fsMain(in: VertexOutput) -> @location(0) vec4f {
    let p = (in.uv * 2.0 - 1.0) * vec2f(controls.w, 1.0);
    let a = controls.y;
    let b = controls.z;
    let mode = u32(controls.x);
    var color: vec3f;
    switch mode {
        case 0u: { color = normalMapPreview(p / 0.85, a, b); }
        case 1u: { color = ggxPreview(p / 0.85, a, b); }
        case 2u: { color = hdrPreview(p, a, b); }
        case 3u: { color = noisePreview(p, u32(a), b); }
        case 4u: { color = toonPreview(p / 0.85, a, b); }
        case 5u: { color = sdfPreview(p, a, b); }
        default: { color = waterPreview(p, a, b); }
    }
    if ((mode == 2u || mode == 3u) && abs(p.x) < 0.006) {
        color = BACKGROUND;
    }
    return vec4f(toSrgb(color), 1.0);
}
