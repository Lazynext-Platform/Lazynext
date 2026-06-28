// Portal Vortex Shader
struct Uniforms {
    time: f32,
    intensity: f32,
    radius: f32,
    swirl_speed: f32,
};

@group(0) @binding(0) var t_diffuse: texture_2d<f32>;
@group(0) @binding(1) var s_diffuse: sampler;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var uv = in.uv;
    
    // Center the UV coordinates [-0.5, 0.5]
    let center = vec2<f32>(0.5, 0.5);
    var p = uv - center;
    
    // Convert to polar coordinates
    let r = length(p);
    var theta = atan2(p.y, p.x);
    
    // Vortex twisting effect
    // The closer to the center, the more it twists
    let twist = uniforms.swirl_speed * uniforms.time * (1.0 / (r + 0.1));
    theta = theta + twist * uniforms.intensity;
    
    // Convert back to cartesian
    p.x = r * cos(theta);
    p.y = r * sin(theta);
    uv = p + center;
    
    // Add a pulsing glow ring around the portal
    let ring_dist = abs(r - uniforms.radius);
    let glow = 0.02 / (ring_dist + 0.01) * uniforms.intensity;
    
    // Luminous Cyan / Deep Blue glow colors
    let glow_color = vec3<f32>(0.0, 0.898, 1.0) * glow * (sin(uniforms.time * 5.0) * 0.2 + 0.8);
    
    // Check bounds (don't sample outside)
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4<f32>(glow_color, 1.0);
    }
    
    let base_color = textureSample(t_diffuse, s_diffuse, uv);
    
    // Blend the original twisted image with the glowing cyan ring
    return vec4<f32>(base_color.rgb + glow_color, base_color.a);
}
