// Full-screen quad vertex shader.
//
// Generates a clip-space quad from NDC positions (-1 to +1) and
// maps them to [0, 1] UV coordinates. Used as the vertex stage
// for all full-screen post-processing passes (blit, bloom, blur,
// color grading, etc.). No uniforms or textures needed.

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

@vertex
fn vertex_main(@location(0) position: vec2f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.tex_coord = vec2f(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
    return output;
}
