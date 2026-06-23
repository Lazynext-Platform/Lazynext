use bytemuck::{Pod, Zeroable};
use gpu::{wgpu, GpuContext, FULLSCREEN_SHADER_SOURCE};

const MSDF_SHADER_SOURCE: &str = include_str!("shaders/msdf.wgsl");

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct MSDFUniformBuffer {
    color: [f32; 4],
    outline_color: [f32; 4],
    shadow_color: [f32; 4],
    px_range: f32,
    outline_width: f32,
    shadow_offset: [f32; 2],
    shadow_blur: f32,
    _padding: [f32; 3],
}

pub struct ApplyMSDFOptions<'a> {
    pub target_view: &'a wgpu::TextureView,
    pub msdf_texture: &'a wgpu::Texture,
    pub color: [f32; 4],
    pub outline_color: [f32; 4],
    pub shadow_color: [f32; 4],
    pub px_range: f32,
    pub outline_width: f32,
    pub shadow_offset: [f32; 2],
    pub shadow_blur: f32,
}

pub struct MSDFPipeline {
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    pipeline: wgpu::RenderPipeline,
}

impl MSDFPipeline {
    pub fn new(context: &GpuContext) -> Self {
        let device = context.device();
        
        let fullscreen_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("compositor-fullscreen-shader-for-msdf"),
            source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
        });
        
        let msdf_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("compositor-msdf-shader"),
            source: wgpu::ShaderSource::Wgsl(MSDF_SHADER_SOURCE.into()),
        });

        let uniform_bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("compositor-msdf-uniform-layout"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("compositor-msdf-pipeline-layout"),
            bind_group_layouts: &[
                Some(context.texture_sampler_bind_group_layout()),
                Some(&uniform_bind_group_layout),
            ],
            immediate_size: 0,
        });

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("compositor-msdf-pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &fullscreen_shader,
                entry_point: Some("vertex_main"),
                buffers: &[wgpu::VertexBufferLayout {
                    array_stride: std::mem::size_of::<[f32; 2]>() as u64,
                    step_mode: wgpu::VertexStepMode::Vertex,
                    attributes: &[wgpu::VertexAttribute {
                        format: wgpu::VertexFormat::Float32x2,
                        offset: 0,
                        shader_location: 0,
                    }],
                }],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &msdf_shader,
                entry_point: Some("fragment_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: context.texture_format(),
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview_mask: None,
            cache: None,
        });

        Self {
            uniform_bind_group_layout,
            pipeline,
        }
    }

    pub fn apply_with_encoder(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        options: ApplyMSDFOptions,
    ) {
        let msdf_view = options.msdf_texture.create_view(&wgpu::TextureViewDescriptor::default());
        
        let texture_bind_group = context.device().create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("compositor-msdf-texture-bind-group"),
            layout: context.texture_sampler_bind_group_layout(),
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&msdf_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                },
            ],
        });

        use wgpu::util::DeviceExt;
        let uniform_buffer = context.device().create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("compositor-msdf-uniform-buffer"),
            contents: bytemuck::bytes_of(&MSDFUniformBuffer {
                color: options.color,
                outline_color: options.outline_color,
                shadow_color: options.shadow_color,
                px_range: options.px_range,
                outline_width: options.outline_width,
                shadow_offset: options.shadow_offset,
                shadow_blur: options.shadow_blur,
                _padding: [0.0; 3],
            }),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let uniform_bind_group = context.device().create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("compositor-msdf-uniform-bind-group"),
            layout: &self.uniform_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniform_buffer.as_entire_binding(),
            }],
        });

        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("compositor-msdf-pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: options.target_view,
                resolve_target: None,
                depth_slice: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Load, // We blend ON TOP of the target
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            occlusion_query_set: None,
            timestamp_writes: None,
            multiview_mask: None,
        });

        render_pass.set_pipeline(&self.pipeline);
        render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
        render_pass.set_bind_group(0, &texture_bind_group, &[]);
        render_pass.set_bind_group(1, &uniform_bind_group, &[]);
        render_pass.draw(0..6, 0..1);
    }
}
