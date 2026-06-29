// Vignette effect shader
// Darkens edges and corners to draw focus toward the center.

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    scalars: vec4f,  // x=intensity, y=radius, z=feather, w=aspect_ratio
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
    let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.scalars.x;
    let radius = uniforms.scalars.y;
    let feather = uniforms.scalars.z;
    let aspect_ratio = uniforms.scalars.w;

    // Compute distance from center, correcting for aspect ratio
    var uv = input.tex_coord - 0.5;
    uv.x *= aspect_ratio;
    let dist = length(uv);

    let vignette = 1.0 - intensity * smootherstep(radius, radius + feather, dist);

    let original = textureSample(input_texture, input_sampler, input.tex_coord);
    return vec4f(original.rgb * vignette, original.a);
}
