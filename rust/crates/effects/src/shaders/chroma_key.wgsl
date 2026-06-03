@group(0) @binding(0) var source_texture: texture_2d<f32>;
@group(0) @binding(1) var source_sampler: sampler;

struct Uniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,
    chroma_color: vec4<f32>,
    chroma_thresholds: vec4<f32>,
};

@group(1) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

fn rgb2ycbcr(color: vec3<f32>) -> vec3<f32> {
    let y = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
    let cb = 128.0/255.0 - 0.168736 * color.r - 0.331264 * color.g + 0.5 * color.b;
    let cr = 128.0/255.0 + 0.5 * color.r - 0.418688 * color.g - 0.081312 * color.b;
    return vec3<f32>(y, cb, cr);
}

@fragment
fn fragment_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let color = textureSample(source_texture, source_sampler, in.tex_coords);
    
    // Convert to YCbCr to isolate chrominance
    let ycbcr = rgb2ycbcr(color.rgb);
    let target_ycbcr = rgb2ycbcr(uniforms.chroma_color.rgb);
    
    // Calculate distance only in the chrominance plane (Cb, Cr)
    let chroma_dist = distance(ycbcr.yz, target_ycbcr.yz);
    
    let similarity = uniforms.chroma_thresholds.x;
    let smoothness = uniforms.chroma_thresholds.y;
    
    // Calculate alpha using smoothstep
    let base_alpha = smoothstep(similarity, similarity + smoothness, chroma_dist);
    
    return vec4<f32>(color.rgb, color.a * base_alpha);
}
