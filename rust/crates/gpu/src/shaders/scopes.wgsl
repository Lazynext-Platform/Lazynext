@group(0) @binding(0) var<storage, read_write> histogram: array<atomic<u32>>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // Basic luminance extraction mock
    let luminance = 128u; 
    atomicAdd(&histogram[luminance], 1u);
}
