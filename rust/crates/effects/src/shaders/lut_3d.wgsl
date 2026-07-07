// 3D Look-Up Table (LUT) color transformation shader.
//
// Maps each source pixel's RGB value as a 3D coordinate into a
// pre-computed color LUT texture. The LUT is sampled via hardware
// trilinear interpolation (texture_3d). Enables complex film
// emulation, creative grades, and camera profiles in a single pass
// without per-pixel math. Preserves source alpha.

@group(0) @binding(0) var source_texture: texture_2d<f32>;
@group(0) @binding(1) var source_sampler: sampler;

@group(1) @binding(0) var lut_texture: texture_3d<f32>;
@group(1) @binding(1) var lut_sampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

@fragment
fn fragment_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let color = textureSample(source_texture, source_sampler, in.tex_coords);
    
    // WebGPU 3D texture coordinates are in [0, 1] range.
    // The color itself acts as the 3D coordinate into the LUT.
    let lut_coord = color.rgb;
    
    // Sample the 3D LUT
    let lut_color = textureSample(lut_texture, lut_sampler, lut_coord);
    
    return vec4<f32>(lut_color.rgb, color.a);
}
