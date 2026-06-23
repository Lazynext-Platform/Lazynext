struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var msdf_texture: texture_2d<f32>;
@group(0) @binding(1) var msdf_sampler: sampler;

struct MSDFUniforms {
    color: vec4<f32>,
    outline_color: vec4<f32>,
    shadow_color: vec4<f32>,
    pxRange: f32,
    outline_width: f32, // 0.0 to 0.5 (relative to SDF)
    shadow_offset: vec2<f32>, // Offset in UV space
    shadow_blur: f32, // Softness of shadow
}
@group(1) @binding(0) var<uniform> uniforms: MSDFUniforms;

fn median(r: f32, g: f32, b: f32) -> f32 {
    return max(min(r, g), min(max(r, g), b));
}

@fragment
fn fragment_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Main fill & outline
    let msd = textureSample(msdf_texture, msdf_sampler, in.uv).rgb;
    let sd = median(msd.r, msd.g, msd.b);
    
    let screenPxDistance = uniforms.pxRange * (sd - 0.5);
    let fillAlpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
    
    // Outline calculation
    let outlineDistance = uniforms.pxRange * (sd - 0.5 + uniforms.outline_width);
    let outlineAlpha = clamp(outlineDistance + 0.5, 0.0, 1.0);
    
    // Mix outline and fill
    let outlineMixed = mix(vec4<f32>(0.0), uniforms.outline_color, outlineAlpha);
    let finalTextColor = mix(outlineMixed, uniforms.color, fillAlpha);

    // Shadow calculation
    let shadowUV = in.uv - uniforms.shadow_offset;
    let shadowMsd = textureSample(msdf_texture, msdf_sampler, shadowUV).rgb;
    let shadowSd = median(shadowMsd.r, shadowMsd.g, shadowMsd.b);
    
    let shadowDistance = uniforms.pxRange * (shadowSd - 0.5);
    // Use shadowBlur to soften the edge
    let shadowAlpha = smoothstep(-uniforms.shadow_blur, uniforms.shadow_blur, shadowDistance) * uniforms.shadow_color.a;
    let shadowMixed = vec4<f32>(uniforms.shadow_color.rgb, shadowAlpha);
    
    // Composite shadow behind text
    // finalAlpha = text.a + shadow.a * (1 - text.a)
    let outAlpha = finalTextColor.a + shadowMixed.a * (1.0 - finalTextColor.a);
    let outRGB = (finalTextColor.rgb * finalTextColor.a + shadowMixed.rgb * shadowMixed.a * (1.0 - finalTextColor.a)) / max(outAlpha, 0.0001);
    
    return vec4<f32>(outRGB, outAlpha);
}
