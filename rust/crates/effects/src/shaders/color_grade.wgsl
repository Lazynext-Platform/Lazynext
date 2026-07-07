// Color grading — exposure, contrast, saturation, and white balance.
//
// Applies a four-stage color pipeline: (1) multiplicative exposure via
// exp2(), (2) contrast pivot around 0.5, (3) luminance-preserving
// saturation with Rec.709 weights, and (4) basic warm/cool white balance
// tint. Scalars [exposure, contrast, saturation, temperature] are
// packed in uniforms.scalars.

struct Uniforms {
    resolution: vec2<f32>,
    direction: vec2<f32>,
    scalars: vec4<f32>,   // [exposure, contrast, saturation, temperature]
    chroma_color: vec4<f32>,
    chroma_thresholds: vec4<f32>,
}

@group(0) @binding(0) var t_source: texture_2d<f32>;
@group(0) @binding(1) var s_source: sampler;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fragment_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let exposure = uniforms.scalars[0];
    let contrast = uniforms.scalars[1];
    let saturation = uniforms.scalars[2];
    let temp = uniforms.scalars[3];

    var color = textureSample(t_source, s_source, uv);
    let a = color.a;
    var rgb = color.rgb;

    // 1. Exposure (Multiplier)
    rgb = rgb * exp2(exposure);

    // 2. Contrast
    rgb = (rgb - 0.5) * max(contrast, 0.0) + 0.5;

    // 3. Saturation (Luminance preserving)
    let luminance = dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    rgb = mix(vec3<f32>(luminance), rgb, max(saturation, 0.0));

    // 4. Temperature (Very basic approximation: Orange vs Blue tint)
    // Positive temp = warmer, Negative temp = cooler
    let warm_tint = vec3<f32>(1.0 + temp * 0.1, 1.0, 1.0 - temp * 0.1);
    rgb = rgb * warm_tint;

    return vec4<f32>(rgb, a);
}
