// VHS tape degradation effect shader.
//
// Combines chromatic aberration (R/G/B channel displacement),
// horizontal scanlines modulated by a sine wave, and temporal
// pseudo-random noise. Intensity scales all three artifacts.
// Time is used as a seed for the noise hash, creating animated
// static that drifts frame-to-frame.

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
}

@group(0) @binding(0) var t_color: texture_2d<f32>;
@group(0) @binding(1) var s_color: sampler;

struct Uniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
    chroma_color: vec4<f32>,
    chroma_thresholds: vec4<f32>,
}

@group(1) @binding(0) var<uniform> uniforms: Uniforms;

// Hash-based pseudo-random value in [0, 1) from a 2D coordinate.
fn rand(n: vec2<f32>) -> f32 {
    return fract(sin(dot(n, vec2<f32>(12.9898, 4.1414))) * 43758.5453);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.tex_coords;
    let time = uniforms.scalars[1]; // u_time
    let intensity = uniforms.scalars[0]; // u_intensity
    
    // Chromatic aberration
    let r_offset = vec2<f32>(0.003 * intensity, 0.0);
    let g_offset = vec2<f32>(0.0, 0.003 * intensity);
    let b_offset = vec2<f32>(-0.003 * intensity, 0.0);
    
    let r = textureSample(t_color, s_color, uv + r_offset).r;
    let g = textureSample(t_color, s_color, uv + g_offset).g;
    let b = textureSample(t_color, s_color, uv + b_offset).b;
    let a = textureSample(t_color, s_color, uv).a;
    
    // Scanlines
    let scanline = sin(uv.y * uniforms.resolution.y * 3.14159 * 0.25) * 0.04 * intensity;
    
    // Noise
    let noise = (rand(uv * time) - 0.5) * 0.1 * intensity;
    
    let color = vec3<f32>(r, g, b) - vec3<f32>(scanline) + vec3<f32>(noise);
    
    return vec4<f32>(color, a);
}
