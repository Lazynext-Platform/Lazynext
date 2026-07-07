// Film emulation — gate weave jitter and halation.
//
// Simulates two analog film artifacts: (1) Gate weave — sub-pixel
// random jitter in X/Y from sprocket instability, driven by a
// time-varying noise function. (2) Halation — red-channel scatter
// around highlights (luma > 0.8), sampled from neighboring pixels
// to approximate light bleeding through the film emulsion layer.
// Intensity is push-constant driven.

@group(0) @binding(0) var t_diffuse: texture_2d<f32>;
@group(0) @binding(1) var s_diffuse: sampler;

struct PushConstants {
    time: f32, // For gate weave random jitter
    intensity: f32, // Halation intensity
    resolution: vec2<f32>,
}
var<push_constant> pc: PushConstants;

// Simple random function based on time and UV
fn random2(st: vec2<f32>) -> f32 {
    return fract(sin(dot(st.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    // 1. Gate Weave Jitter
    let jitter_x = (random2(vec2<f32>(pc.time, 1.0)) - 0.5) * 0.002;
    let jitter_y = (random2(vec2<f32>(1.0, pc.time)) - 0.5) * 0.002;
    let jittered_uv = uv + vec2<f32>(jitter_x, jitter_y);

    // Sample the base texture with gate weave
    let base_color = textureSample(t_diffuse, s_diffuse, jittered_uv);

    // 2. Halation (Red scatter)
    // Extract luma to find highlights
    let luma = dot(base_color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    
    // Very naive blur-based halation mask (mock logic)
    var halation_red = 0.0;
    if (luma > 0.8) {
        // Red scatter radius
        let offset = 0.005;
        let s1 = textureSample(t_diffuse, s_diffuse, jittered_uv + vec2<f32>(offset, 0.0));
        let s2 = textureSample(t_diffuse, s_diffuse, jittered_uv + vec2<f32>(-offset, 0.0));
        let s3 = textureSample(t_diffuse, s_diffuse, jittered_uv + vec2<f32>(0.0, offset));
        let s4 = textureSample(t_diffuse, s_diffuse, jittered_uv + vec2<f32>(0.0, -offset));
        let avg_red = (s1.r + s2.r + s3.r + s4.r) * 0.25;
        halation_red = avg_red * pc.intensity;
    }

    let final_color = vec3<f32>(
        base_color.r + halation_red,
        base_color.g,
        base_color.b
    );

    return vec4<f32>(final_color, base_color.a);
}
