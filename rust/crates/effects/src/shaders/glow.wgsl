// Glow / Bloom effect shader
// Creates a soft glow around bright areas by thresholding and blurring.

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    scalars: vec4f,  // x=threshold, y=intensity, z=blur_radius, w=time
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let texel_size = 1.0 / uniforms.resolution;
    let threshold = uniforms.scalars.x;
    let intensity = uniforms.scalars.y;
    let blur_radius = uniforms.scalars.z;

    // Sample 5-tap horizontal blur for bright areas only
    var bloom = vec4f(0.0, 0.0, 0.0, 0.0);
    let weights = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

    for (var i = -2; i <= 2; i = i + 1) {
        let offset = vec2f(f32(i) * blur_radius * texel_size.x, 0.0);
        let sample_color = textureSample(input_texture, input_sampler, input.tex_coord + offset);
        let brightness = dot(sample_color.rgb, vec3f(0.2126, 0.7152, 0.0722));
        if (brightness > threshold) {
            bloom += sample_color * weights[i + 2];
        }
    }

    let original = textureSample(input_texture, input_sampler, input.tex_coord);
    let result = original + bloom * intensity;
    return vec4f(result.rgb, original.a);
}
