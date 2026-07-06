//! GPU-accelerated mask feathering via Jump Flood Algorithm (JFA).
//!
//! Computes a signed distance field from a binary mask texture and applies a
//! configurable feather radius to produce soft-edged alpha masks usable as
//! tracking mattes or rotoscoping guides.

use bytemuck::{Pod, Zeroable};
use gpu::{FULLSCREEN_SHADER_SOURCE, GpuContext};
use wgpu::util::DeviceExt;

use crate::SdfPipeline;

const JFA_DISTANCE_SHADER_SOURCE: &str = include_str!("shaders/jfa_distance.wgsl");

/// Options for the mask feathering pass.
///
/// Specifies the input binary mask texture, its dimensions, and the desired
/// feather radius. The output is a soft-edged alpha mask suitable for tracking
/// mattes and rotoscoping guides.
pub struct ApplyMaskFeatherOptions<'a> {
    /// Input binary mask texture to be feathered.
    pub mask: &'a wgpu::Texture,
    /// Width of the mask texture in pixels.
    pub width: u32,
    /// Height of the mask texture in pixels.
    pub height: u32,
    /// Feather radius in pixels; larger values produce softer edges.
    pub feather: f32,
}

/// GPU render pipeline that applies a configurable feather radius to a binary
/// mask by combining inside and outside signed distance fields.
///
/// Uses the Jump Flood Algorithm (JFA) via [`SdfPipeline`] to compute distance
/// fields, then blends them in a single distance-based feather shader.
pub struct MaskFeatherPipeline {
    sdf_pipeline: SdfPipeline,
    inside_texture_bind_group_layout: wgpu::BindGroupLayout,
    outside_texture_bind_group_layout: wgpu::BindGroupLayout,
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    distance_pipeline: wgpu::RenderPipeline,
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct DistanceUniformBuffer {
    resolution: [f32; 2],
    feather_half: f32,
    _padding: f32,
}

impl MaskFeatherPipeline {
    /// Creates a new mask feather pipeline with the given GPU context.
    ///
    /// Compiles the JFA distance WGSL shader and sets up all bind group
    /// layouts and the distance render pipeline.
    pub fn new(context: &GpuContext) -> Self {
        let device = context.device();
        let inside_texture_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("gpu-mask-distance-inside-layout"),
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                        count: None,
                    },
                ],
            });
        let outside_texture_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("gpu-mask-distance-outside-layout"),
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                        count: None,
                    },
                ],
            });
        let uniform_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("gpu-mask-distance-uniform-layout"),
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
            label: Some("gpu-mask-distance-pipeline-layout"),
            bind_group_layouts: &[
                Some(&inside_texture_bind_group_layout),
                Some(&outside_texture_bind_group_layout),
                Some(&uniform_bind_group_layout),
            ],
            immediate_size: 0,
        });
        let vertex_shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("gpu-mask-distance-fullscreen-shader"),
            source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
        });
        let fragment_shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("gpu-mask-distance-fragment-shader"),
            source: wgpu::ShaderSource::Wgsl(JFA_DISTANCE_SHADER_SOURCE.into()),
        });
        let distance_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("gpu-mask-distance-pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &vertex_shader_module,
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
                module: &fragment_shader_module,
                entry_point: Some("fragment_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: context.texture_format(),
                    blend: None,
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
            sdf_pipeline: SdfPipeline::new(context),
            inside_texture_bind_group_layout,
            outside_texture_bind_group_layout,
            uniform_bind_group_layout,
            distance_pipeline,
        }
    }

    /// Applies a feather to a binary mask, creating and submitting a new
    /// command encoder and returning a soft-edged alpha texture.
    ///
    /// This is the high-level entry point; for batched GPU work use
    /// [`apply_mask_feather_with_encoder`](Self::apply_mask_feather_with_encoder)
    /// to avoid extra encoder overhead.
    pub fn apply_mask_feather(
        &self,
        context: &GpuContext,
        options_raw: ApplyMaskFeatherOptions<'_>,
    ) -> wgpu::Texture {
        // Sanitize inputs: clamp feather, ensure positive dimensions
        let feather = if options_raw.feather.is_finite() && options_raw.feather > 0.0 {
            options_raw.feather.min(1000.0)
        } else {
            0.0
        };
        let width = options_raw.width.max(1);
        let height = options_raw.height.max(1);

        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("gpu-mask-distance-command-encoder"),
                });
        let output = self.apply_mask_feather_with_encoder(
            context,
            &mut encoder,
            ApplyMaskFeatherOptions {
                mask: options_raw.mask,
                width,
                height,
                feather,
            },
        );
        context.queue().submit([encoder.finish()]);
        output
    }

    /// Applies a feather to a binary mask using an existing command encoder.
    ///
    /// Useful for batching multiple feather operations into a single encoder
    /// submission. Returns a soft-edged alpha texture.
    pub fn apply_mask_feather_with_encoder(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        ApplyMaskFeatherOptions {
            mask,
            width,
            height,
            feather,
        }: ApplyMaskFeatherOptions<'_>,
    ) -> wgpu::Texture {
        let sdf = self
            .sdf_pipeline
            .compute_signed_distance_field_with_encoder(context, encoder, mask, width, height);
        let output_texture = context.create_render_texture(width, height, "masks-feather-output");
        let inside_view = sdf
            .inside_texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let outside_view = sdf
            .outside_texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let output_view = output_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let inside_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("gpu-mask-distance-inside-bind-group"),
                layout: &self.inside_texture_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&inside_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.nearest_sampler()),
                    },
                ],
            });
        let outside_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("gpu-mask-distance-outside-bind-group"),
                layout: &self.outside_texture_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&outside_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.nearest_sampler()),
                    },
                ],
            });
        let uniform_buffer =
            context
                .device()
                .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                    label: Some("gpu-mask-distance-uniform-buffer"),
                    contents: bytemuck::bytes_of(&DistanceUniformBuffer {
                        resolution: [width as f32, height as f32],
                        feather_half: feather / 2.0,
                        _padding: 0.0,
                    }),
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                });
        let uniform_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("gpu-mask-distance-uniform-bind-group"),
                layout: &self.uniform_bind_group_layout,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                }],
            });
        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("gpu-mask-distance-render-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &output_view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
                multiview_mask: None,
            });
            render_pass.set_pipeline(&self.distance_pipeline);
            render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
            render_pass.set_bind_group(0, &inside_bind_group, &[]);
            render_pass.set_bind_group(1, &outside_bind_group, &[]);
            render_pass.set_bind_group(2, &uniform_bind_group, &[]);
            render_pass.draw(0..6, 0..1);
        }
        output_texture
    }
}
