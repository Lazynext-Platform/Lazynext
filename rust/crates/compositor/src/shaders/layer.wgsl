// Layer transform & image adjustment on GPU.
//
// Applies 2D affine transforms (translate, rotate, scale, flip, crop)
// to an input texture. Runs a full adjustment pipeline: brightness,
// contrast, saturation, grayscale, sepia, invert, hue rotation,
// pixelation, and edge detection. Also renders a soft SDF-based
// drop shadow with configurable distance, angle, blur, and color.
// Border-radius clipping uses signed-distance-field math for
// anti-aliased rounded corners.

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct LayerUniforms {
    resolution: vec2f,
    center: vec2f,
    size: vec2f,
    rotation_radians: f32,
    opacity: f32,
    flip_x: f32,
    flip_y: f32,
    brightness: f32,
    contrast: f32,
    saturation: f32,
    grayscale: f32,
    pixelate: f32,
    edge_detect: f32,
    crop: vec4f, // left, top, right, bottom (0.0 to 1.0)
    border_radius: f32, // 0.0 to 1.0
    sepia: f32,
    invert: f32,
    hue_rotate: f32,
    shadow_color: vec4f, // RGBA
    shadow_distance: f32,
    shadow_angle: f32,
    shadow_blur: f32,
    shadow_padding: f32,
}

@group(0) @binding(0) var source_texture: texture_2d<f32>;
@group(0) @binding(1) var source_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: LayerUniforms;

fn rotate_inverse(point: vec2f, angle: f32) -> vec2f {
    let c = cos(angle);
    let s = sin(angle);
    return vec2f(
        point.x * c + point.y * s,
        -point.x * s + point.y * c,
    );
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let pixel = input.tex_coord * uniforms.resolution;
    let local = rotate_inverse(pixel - uniforms.center, uniforms.rotation_radians);

    let uv = vec2f(
        local.x / uniforms.size.x + 0.5,
        local.y / uniforms.size.y + 0.5,
    );

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        // Outside the actual image. If there is no shadow, we return empty.
        // We will calculate shadow below and return it if applicable.
    }

    let rect_min = vec2f(uniforms.crop.x, uniforms.crop.y) * uniforms.size;
    let rect_max = vec2f(1.0 - uniforms.crop.z, 1.0 - uniforms.crop.w) * uniforms.size;
    
    let rect_size = rect_max - rect_min;
    let rect_center = rect_min + rect_size * 0.5;
    
    let p = uv * uniforms.size - rect_center;
    let b = rect_size * 0.5;
    // border_radius 1.0 means perfectly round corners up to half the shortest side
    let r = min(b.x, b.y) * uniforms.border_radius; 
    
    let q = abs(p) - b + vec2f(r);
    let d = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
    
    var in_bounds = false;
    if (d <= 0.5 && uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
        in_bounds = true;
    }
    
    // Calculate SDF Drop Shadow
    var shadow_alpha = 0.0;
    if (uniforms.shadow_color.a > 0.0) {
        let dist = uniforms.shadow_distance * min(uniforms.size.x, uniforms.size.y);
        let shadow_offset = vec2f(cos(uniforms.shadow_angle), sin(uniforms.shadow_angle)) * dist;
        let shadow_p = p - shadow_offset;
        let shadow_q = abs(shadow_p) - b + vec2f(r);
        let shadow_d = length(max(shadow_q, vec2f(0.0))) + min(max(shadow_q.x, shadow_q.y), 0.0) - r;
        
        // Use smoothstep for a cheap blur effect on the SDF
        // A wider smoothstep range creates a softer shadow
        let blur_radius = max(0.01, uniforms.shadow_blur * min(uniforms.size.x, uniforms.size.y) * 0.1);
        shadow_alpha = (1.0 - smoothstep(-blur_radius, blur_radius, shadow_d)) * uniforms.shadow_color.a;
    }

    if (!in_bounds) {
        if (shadow_alpha > 0.0) {
            return vec4f(uniforms.shadow_color.rgb * shadow_alpha, shadow_alpha);
        }
        return vec4f(0.0, 0.0, 0.0, 0.0);
    }
    
    let aa_mask = 1.0 - smoothstep(-0.5, 0.5, d);

    var sample_uv = vec2f(
        select(uv.x, 1.0 - uv.x, uniforms.flip_x > 0.5),
        select(uv.y, 1.0 - uv.y, uniforms.flip_y > 0.5),
    );
    
    // Apply Pixelation
    if (uniforms.pixelate > 0.0) {
        // Uniform pixelate implies splitting width into chunks
        let chunks = max(2.0, 500.0 - (uniforms.pixelate * 498.0)); // 1.0 = 2 chunks, 0.0 = 500 chunks
        let aspect = uniforms.size.y / uniforms.size.x;
        let chunks_y = chunks * aspect;
        sample_uv = vec2f(
            floor(sample_uv.x * chunks) / chunks,
            floor(sample_uv.y * chunks_y) / chunks_y
        );
    }
    
    var color = textureSampleLevel(source_texture, source_sampler, sample_uv, 0.0);
    
    // Apply brightness
    color = vec4f(color.rgb * uniforms.brightness, color.a);
    
    // Apply contrast
    color = vec4f((color.rgb - 0.5) * uniforms.contrast + 0.5, color.a);
    
    // Apply saturation
    let luminance = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
    let luminance_vec = vec3f(luminance, luminance, luminance);
    color = vec4f(mix(luminance_vec, color.rgb, uniforms.saturation), color.a);
    
    // Apply grayscale
    color = vec4f(mix(color.rgb, luminance_vec, uniforms.grayscale), color.a);
    
    // Apply sepia
    let sepia_color = vec3f(
        dot(color.rgb, vec3f(0.393, 0.769, 0.189)),
        dot(color.rgb, vec3f(0.349, 0.686, 0.168)),
        dot(color.rgb, vec3f(0.272, 0.534, 0.131))
    );
    color = vec4f(mix(color.rgb, sepia_color, uniforms.sepia), color.a);
    
    // Apply invert
    color = vec4f(mix(color.rgb, vec3f(1.0) - color.rgb, uniforms.invert), color.a);
    
    // Apply hue rotate
    if (uniforms.hue_rotate != 0.0) {
        let angle = uniforms.hue_rotate;
        let cosA = cos(angle);
        let sinA = sin(angle);
        let hueMat = mat3x3<f32>(
            vec3f(0.213 + cosA*0.787 - sinA*0.213, 0.213 - cosA*0.213 + sinA*0.143, 0.213 - cosA*0.213 - sinA*0.787),
            vec3f(0.715 - cosA*0.715 - sinA*0.715, 0.715 + cosA*0.285 + sinA*0.140, 0.715 - cosA*0.715 + sinA*0.715),
            vec3f(0.072 - cosA*0.072 + sinA*0.928, 0.072 - cosA*0.072 - sinA*0.283, 0.072 + cosA*0.928 + sinA*0.072)
        );
        color = vec4f(hueMat * color.rgb, color.a);
    }
    
    // Apply Edge Detection (Sobel-style difference)
    if (uniforms.edge_detect > 0.0) {
        let dx = 1.0 / uniforms.size.x;
        let dy = 1.0 / uniforms.size.y;
        
        let cLeft = textureSampleLevel(source_texture, source_sampler, sample_uv + vec2f(-dx, 0.0), 0.0).rgb;
        let cRight = textureSampleLevel(source_texture, source_sampler, sample_uv + vec2f(dx, 0.0), 0.0).rgb;
        let cUp = textureSampleLevel(source_texture, source_sampler, sample_uv + vec2f(0.0, -dy), 0.0).rgb;
        let cDown = textureSampleLevel(source_texture, source_sampler, sample_uv + vec2f(0.0, dy), 0.0).rgb;
        
        let edgesX = abs(cLeft - cRight);
        let edgesY = abs(cUp - cDown);
        let edge_val = length(edgesX + edgesY);
        let edge_color = vec3f(edge_val, edge_val, edge_val);
        
        color = vec4f(mix(color.rgb, edge_color, uniforms.edge_detect), color.a);
    }
    
    // Clamp values to prevent weird artifacts
    color = clamp(color, vec4f(0.0), vec4f(1.0));
    var final_color = vec4f(color.rgb, color.a * aa_mask) * uniforms.opacity;
    
    // Blend the shadow behind the clip if there's any transparency in the clip or AA mask
    if (shadow_alpha > 0.0) {
        let shadow_c = vec4f(uniforms.shadow_color.rgb * shadow_alpha, shadow_alpha);
        // Alpha composite: final_color OVER shadow_c
        let out_a = final_color.a + shadow_c.a * (1.0 - final_color.a);
        let out_rgb = (final_color.rgb * final_color.a + shadow_c.rgb * shadow_c.a * (1.0 - final_color.a)) / max(out_a, 0.0001);
        final_color = vec4f(out_rgb * out_a, out_a);
    }
    
    return final_color;
}
