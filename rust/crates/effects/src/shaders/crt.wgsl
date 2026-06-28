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

// Distorts UV coordinates to simulate screen curvature
fn curve_uv(uv: vec2<f32>, curvature: f32) -> vec2<f32> {
    var uv_norm = uv * 2.0 - 1.0;
    let offset = uv_norm.yx / curvature;
    uv_norm = uv_norm + uv_norm * offset * offset;
    return uv_norm * 0.5 + 0.5;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let intensity = uniforms.scalars[0]; // u_intensity
    let curvature = 4.0 / max(intensity, 0.01);
    
    let uv = curve_uv(in.tex_coords, curvature);
    
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    
    let color = textureSample(t_color, s_color, uv);
    
    // Vignette
    var uv_norm = in.tex_coords * 2.0 - 1.0;
    let vignette = 1.0 - dot(uv_norm, uv_norm) * 0.3 * intensity;
    
    return vec4<f32>(color.rgb * vignette, color.a);
}
