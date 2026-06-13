struct Uniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>, // unused for glitch, kept for uniform buffer alignment
    scalars: vec4<f32>,   // [intensity, time, 0.0, 0.0]
    chroma_color: vec4<f32>,
    chroma_thresholds: vec4<f32>,
}

@group(0) @binding(0) var t_source: texture_2d<f32>;
@group(0) @binding(1) var s_source: sampler;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fragment_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let intensity = uniforms.scalars[0];
    let time = uniforms.scalars[1];
    
    // Create some pseudo-random noise based on uv and time
    let noise_x = fract(sin(dot(uv + vec2<f32>(time, time), vec2<f32>(12.9898, 78.233))) * 43758.5453);
    let noise_y = fract(cos(dot(uv - vec2<f32>(time, time), vec2<f32>(12.9898, 78.233))) * 43758.5453);
    
    // Chromatic Aberration offsets
    let r_offset = vec2<f32>(noise_x * 0.05 * intensity, noise_y * 0.01 * intensity);
    let b_offset = vec2<f32>(-noise_x * 0.05 * intensity, -noise_y * 0.01 * intensity);
    
    let color_r = textureSample(t_source, s_source, uv + r_offset).r;
    let color_g = textureSample(t_source, s_source, uv).g; // Green stays center
    let color_b = textureSample(t_source, s_source, uv + b_offset).b;
    let alpha = textureSample(t_source, s_source, uv).a;
    
    // Simple scanline effect
    let scanline = sin(uv.y * uniforms.resolution.y * 0.5 + time * 10.0) * 0.04 * intensity;
    
    return vec4<f32>(color_r - scanline, color_g - scanline, color_b - scanline, alpha);
}
