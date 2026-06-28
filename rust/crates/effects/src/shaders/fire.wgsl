// Fire Shader (Luminous Cyan and Deep Blue)
struct Uniforms {
    time: f32,
    intensity: f32,
    scale: f32,
    _padding: f32,
};

@group(0) @binding(0) var t_diffuse: texture_2d<f32>;
@group(0) @binding(1) var s_diffuse: sampler;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

// Simple pseudo-random function
fn hash(p: vec2<f32>) -> f32 {
    let p3  = fract(vec3<f32>(p.xyx) * .1031);
    let p3_2 = p3 + dot(p3, p3.yzx + 33.33);
    return fract((p3_2.x + p3_2.y) * p3_2.z);
}

// 2D Noise
fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    
    // Four corners
    let a = hash(i);
    let b = hash(i + vec2<f32>(1.0, 0.0));
    let c = hash(i + vec2<f32>(0.0, 1.0));
    let d = hash(i + vec2<f32>(1.0, 1.0));

    // Smooth Interpolation
    let u = f * f * (3.0 - 2.0 * f);

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion
fn fbm(p: vec2<f32>) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var shift = vec2<f32>(100.0);
    
    // Rotate to reduce axial bias
    let mat = mat2x2<f32>(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    var pt = p;
    
    for (var i = 0; i < 5; i++) {
        v += a * noise(pt);
        pt = mat * pt * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv;
    
    // Offset UV by time to make it scroll up like fire
    var q = vec2<f32>(0.0);
    q.x = fbm(uv + 0.00 * uniforms.time);
    q.y = fbm(uv + vec2<f32>(1.0));
    
    var r = vec2<f32>(0.0);
    r.x = fbm(uv + 1.0 * q + vec2<f32>(1.7, 9.2) + 0.15 * uniforms.time);
    r.y = fbm(uv + 1.0 * q + vec2<f32>(8.3, 2.8) + 0.126 * uniforms.time);
    
    let f = fbm(uv + r * uniforms.scale);
    
    // Lazynext Brand Colors
    // Deep Blue: rgb(0.0, 0.2, 1.0)
    // Luminous Cyan: rgb(0.0, 0.898, 1.0)
    
    let color_dark = vec3<f32>(0.0, 0.2, 1.0); // Deep Blue
    let color_light = vec3<f32>(0.0, 0.898, 1.0); // Cyan
    let color_white = vec3<f32>(0.8, 0.95, 1.0);
    
    var color = mix(color_dark, color_light, clamp((f * f) * 4.0, 0.0, 1.0));
    color = mix(color, color_white, clamp(length(q), 0.0, 1.0));
    color = mix(color, color_light, clamp(length(r.x), 0.0, 1.0));
    
    // Modulate intensity based on vertical position (fade out at top)
    let intensity = uniforms.intensity * (1.0 - uv.y) * 2.0;
    
    // Original image
    let base_color = textureSample(t_diffuse, s_diffuse, in.uv);
    
    // Additive blend with fire
    let final_color = base_color.rgb + (color * f * f * f * intensity);
    
    return vec4<f32>(final_color, base_color.a);
}
