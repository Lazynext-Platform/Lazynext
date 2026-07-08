//! GPU effects pipeline that applies post-processing effect shaders
//! (gaussian blur, chroma key, glitch, color grade, fire, portal,
//! VHS, CRT, glow, vignette, and 3D LUT) to textures via wgpu
//! render passes. Supports chained effect passes with per-pass
//! uniform parameters and batching with external command encoders.
//!
//! ## Architecture
//!
//! The [`EffectPipeline`] compiles all 10 built-in effect shaders into
//! individual wgpu render pipelines at construction time. Each pipeline
//! shares a common fullscreen-quad vertex shader and differs only in its
//! fragment shader. Uniforms are packed into a single [`EffectUniformBuffer`]
//! per pass and bound alongside the input texture.
//!
//! Effects are applied as a **chain** — each pass reads the output of the
//! previous pass (or the original source on the first pass), rendering into
//! a fresh intermediate texture via a fullscreen-quad draw call. The final
//! intermediate texture is returned as the output.

use std::collections::HashMap;

use bytemuck::{Pod, Zeroable};
use gpu::{FULLSCREEN_SHADER_SOURCE, GpuContext};
use thiserror::Error;
use wgpu::util::DeviceExt;

use crate::{EffectPass, UniformValue};

// ── Shader IDs & Sources ──
// Each effect has a string ID (used as a key in the pipeline map) and
// the corresponding WGSL fragment shader source inlined at compile time.

const GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur";
const GAUSSIAN_BLUR_SHADER_SOURCE: &str = include_str!("shaders/gaussian_blur.wgsl");

const CHROMA_KEY_SHADER_ID: &str = "chroma-key";
const CHROMA_KEY_SHADER_SOURCE: &str = include_str!("shaders/chroma_key.wgsl");

const GLITCH_SHADER_ID: &str = "glitch";
const GLITCH_SHADER_SOURCE: &str = include_str!("shaders/glitch.wgsl");

const COLOR_GRADE_SHADER_ID: &str = "color-grade";
const COLOR_GRADE_SHADER_SOURCE: &str = include_str!("shaders/color_grade.wgsl");

const FIRE_SHADER_ID: &str = "fire";
const FIRE_SHADER_SOURCE: &str = include_str!("shaders/fire.wgsl");

const PORTAL_SHADER_ID: &str = "portal";
const PORTAL_SHADER_SOURCE: &str = include_str!("shaders/portal.wgsl");

const VHS_SHADER_ID: &str = "vhs";
const VHS_SHADER_SOURCE: &str = include_str!("shaders/vhs.wgsl");

const CRT_SHADER_ID: &str = "crt";
const CRT_SHADER_SOURCE: &str = include_str!("shaders/crt.wgsl");

const GLOW_SHADER_ID: &str = "glow";
const GLOW_SHADER_SOURCE: &str = include_str!("shaders/glow.wgsl");

const VIGNETTE_SHADER_ID: &str = "vignette";
const VIGNETTE_SHADER_SOURCE: &str = include_str!("shaders/vignette.wgsl");

const LUT_3D_SHADER_SOURCE: &str = include_str!("shaders/lut_3d.wgsl");

// ── Input / Output Types ──

/// Input parameters for applying a chain of effects passes.
pub struct ApplyEffectsOptions<'a> {
    /// The source texture to read from.
    pub source: &'a wgpu::Texture,
    /// Output width in pixels.
    pub width: u32,
    /// Output height in pixels.
    pub height: u32,
    /// Ordered list of effect passes to apply.
    pub passes: &'a [EffectPass],
}

// ── Effect Pipeline State ──

/// GPU pipeline that applies post-processing effects via compute shaders.
pub struct EffectPipeline {
    /// Bind group layout for per-pass uniform buffers.
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    /// Bind group layout for the 3D LUT texture and sampler.
    lut3d_bind_group_layout: wgpu::BindGroupLayout,
    /// Compiled render pipelines keyed by shader id.
    pipelines: HashMap<String, wgpu::RenderPipeline>,
    /// Dedicated render pipeline for 3D LUT application.
    lut3d_pipeline: wgpu::RenderPipeline,
}

// ── Error Types ──

/// Errors that can occur while validating or applying effect passes.
#[derive(Debug, Error)]
pub enum EffectsError {
    /// No effect passes were supplied to apply.
    #[error("At least one effect pass is required")]
    MissingEffectPasses,
    /// The requested shader id has no registered pipeline.
    #[error("Unknown effect shader '{shader}'")]
    UnknownEffectShader {
        /// Identifier of the unknown shader.
        shader: String,
    },
    /// A required uniform was not provided for the shader.
    #[error("Missing uniform '{uniform}' for shader '{shader}'")]
    MissingUniform {
        /// Shader that expected the uniform.
        shader: String,
        /// Name of the missing uniform.
        uniform: String,
    },
    /// A uniform expected to be a number was of the wrong type.
    #[error("Uniform '{uniform}' for shader '{shader}' must be a number")]
    InvalidNumberUniform {
        /// Shader that expected the uniform.
        shader: String,
        /// Name of the invalid uniform.
        uniform: String,
    },
    /// A uniform expected to be a vector was missing or of the wrong length.
    #[error(
        "Uniform '{uniform}' for shader '{shader}' must be a vector of length {expected_length}"
    )]
    InvalidVectorUniform {
        /// Shader that expected the uniform.
        shader: String,
        /// Name of the invalid uniform.
        uniform: String,
        /// Required vector length.
        expected_length: usize,
    },
    /// The shader does not accept the provided uniform.
    #[error("Shader '{shader}' does not support uniform '{uniform}'")]
    UnsupportedUniform {
        /// Shader that received the unsupported uniform.
        shader: String,
        /// Name of the unsupported uniform.
        uniform: String,
    },
}

// ── GPU Uniform Buffer ──
// All per-pass parameters are packed into this single uniform struct.
// Each shader reads the slots it needs; unused slots are zeroed.
// Layout: resolution (vec2) | direction (vec2) | scalars (vec4) |
// chroma_color (vec4) | chroma_thresholds (vec4)
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct EffectUniformBuffer {
    /// Output resolution in pixels (width, height).
    resolution: [f32; 2],
    /// Blur/sampling direction vector.
    direction: [f32; 2],
    /// Generic scalar parameters read per shader.
    scalars: [f32; 4],
    /// Chroma-key target color (RGBA).
    chroma_color: [f32; 4],
    /// Chroma-key thresholds (similarity, smoothness, unused, unused).
    chroma_thresholds: [f32; 4],
}

// ── Pipeline Construction ──
// Compiles all 10 built-in effect shaders into wgpu render pipelines.
// Each pipeline shares a common fullscreen-quad vertex shader and a shared
// pipeline layout (texture bind group + uniform bind group).

impl EffectPipeline {
    /// Create a new effect pipeline, compiling all built-in effect shaders.
    pub fn new(context: &GpuContext) -> Self {
        // Two bind group layouts are created:
        // 1. uniform_bind_group_layout — for per-pass uniform buffers (binding 0)
        // 2. lut3d_bind_group_layout — for the 3D LUT texture + sampler (bindings 0, 1)
        let uniform_bind_group_layout =
            context
                .device()
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("effects-uniform-bind-group-layout"),
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

        let lut3d_bind_group_layout =
            context
                .device()
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("effects-lut3d-bind-group-layout"),
                    entries: &[
                        wgpu::BindGroupLayoutEntry {
                            binding: 0,
                            visibility: wgpu::ShaderStages::FRAGMENT,
                            ty: wgpu::BindingType::Texture {
                                multisampled: false,
                                view_dimension: wgpu::TextureViewDimension::D3,
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

        // The shared fullscreen-quad vertex shader — every effect pipeline reuses it.
        let vertex_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-fullscreen-shader"),
                    source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
                });
        let gaussian_blur_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-gaussian-blur-shader"),
                    source: wgpu::ShaderSource::Wgsl(GAUSSIAN_BLUR_SHADER_SOURCE.into()),
                });
        // The shared pipeline layout: texture+sampler at group 0, uniform buffer at group 1.
        // Every built-in effect pipeline (except LUT) uses this layout.
        let pipeline_layout =
            context
                .device()
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("effects-pipeline-layout"),
                    bind_group_layouts: &[
                        Some(context.texture_sampler_bind_group_layout()),
                        Some(&uniform_bind_group_layout),
                    ],
                    immediate_size: 0,
                });

        // ── Per-Effect Shader Modules ──
        // All fragment shader modules are compiled upfront. The gaussian blur
        // module was compiled above; the remaining 9 follow below.

        let lut3d_pipeline_layout =
            context
                .device()
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("effects-lut3d-pipeline-layout"),
                    bind_group_layouts: &[
                        Some(context.texture_sampler_bind_group_layout()),
                        Some(&lut3d_bind_group_layout),
                    ],
                    immediate_size: 0,
                });

        let chroma_key_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-chroma-key-shader"),
                    source: wgpu::ShaderSource::Wgsl(CHROMA_KEY_SHADER_SOURCE.into()),
                });
        let glitch_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-glitch-shader"),
                    source: wgpu::ShaderSource::Wgsl(GLITCH_SHADER_SOURCE.into()),
                });
        let color_grade_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-color-grade-shader"),
                    source: wgpu::ShaderSource::Wgsl(COLOR_GRADE_SHADER_SOURCE.into()),
                });
        let fire_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-fire-shader"),
                    source: wgpu::ShaderSource::Wgsl(FIRE_SHADER_SOURCE.into()),
                });
        let portal_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-portal-shader"),
                    source: wgpu::ShaderSource::Wgsl(PORTAL_SHADER_SOURCE.into()),
                });
        let vhs_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-vhs-shader"),
                    source: wgpu::ShaderSource::Wgsl(VHS_SHADER_SOURCE.into()),
                });
        let crt_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-crt-shader"),
                    source: wgpu::ShaderSource::Wgsl(CRT_SHADER_SOURCE.into()),
                });
        let glow_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-glow-shader"),
                    source: wgpu::ShaderSource::Wgsl(GLOW_SHADER_SOURCE.into()),
                });
        let vignette_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-vignette-shader"),
                    source: wgpu::ShaderSource::Wgsl(VIGNETTE_SHADER_SOURCE.into()),
                });

        let lut3d_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-lut3d-shader"),
                    source: wgpu::ShaderSource::Wgsl(LUT_3D_SHADER_SOURCE.into()),
                });

        // ── Per-Effect Render Pipelines ──
        // Each pipeline combines the shared vertex shader with its unique
        // fragment shader under the shared pipeline layout.

        let gaussian_blur_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-gaussian-blur-pipeline"),
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
                        module: &gaussian_blur_shader_module,
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

        let chroma_key_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-chroma-key-pipeline"),
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
                        module: &chroma_key_shader_module,
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

        let glitch_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-glitch-pipeline"),
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
                        module: &glitch_shader_module,
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

        let color_grade_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-color-grade-pipeline"),
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
                        module: &color_grade_shader_module,
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

        let fire_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-fire-pipeline"),
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
                        module: &fire_shader_module,
                        entry_point: Some("fs_main"),
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

        let portal_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-portal-pipeline"),
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
                        module: &portal_shader_module,
                        entry_point: Some("fs_main"),
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

        let vhs_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-vhs-pipeline"),
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
                        module: &vhs_shader_module,
                        entry_point: Some("fs_main"),
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

        let crt_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-crt-pipeline"),
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
                        module: &crt_shader_module,
                        entry_point: Some("fs_main"),
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

        let glow_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-glow-pipeline"),
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
                        module: &glow_shader_module,
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

        let vignette_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-vignette-pipeline"),
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
                        module: &vignette_shader_module,
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

        let pipelines = HashMap::from([
            (GAUSSIAN_BLUR_SHADER_ID.to_string(), gaussian_blur_pipeline),
            (CHROMA_KEY_SHADER_ID.to_string(), chroma_key_pipeline),
            (GLITCH_SHADER_ID.to_string(), glitch_pipeline),
            (COLOR_GRADE_SHADER_ID.to_string(), color_grade_pipeline),
            (FIRE_SHADER_ID.to_string(), fire_pipeline),
            (PORTAL_SHADER_ID.to_string(), portal_pipeline),
            (VHS_SHADER_ID.to_string(), vhs_pipeline),
            (CRT_SHADER_ID.to_string(), crt_pipeline),
            (GLOW_SHADER_ID.to_string(), glow_pipeline),
            (VIGNETTE_SHADER_ID.to_string(), vignette_pipeline),
        ]);

        // LUT pipeline uses a separate layout (lut3d_pipeline_layout) because it
        // binds the lookup-table texture at group 1 instead of uniform data.
        let lut3d_pipeline =
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some("effects-lut3d-pipeline"),
                    layout: Some(&lut3d_pipeline_layout),
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
                        module: &lut3d_shader_module,
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
            uniform_bind_group_layout,
            lut3d_bind_group_layout,
            pipelines,
            lut3d_pipeline,
        }
    }
}

/// Input parameters for applying a 3D LUT color transform.
pub struct ApplyLutOptions<'a> {
    /// The source texture to read from.
    pub source: &'a wgpu::Texture,
    /// Output width in pixels.
    pub width: u32,
    /// Output height in pixels.
    pub height: u32,
    /// The 3D lookup-table texture.
    pub lut_texture: &'a wgpu::Texture,
}

// ── LUT Application ──

impl EffectPipeline {
    /// Apply a 3D LUT color grade to the source texture, returning the output texture.
    pub fn apply_lut(
        &self,
        context: &GpuContext,
        ApplyLutOptions {
            source,
            width,
            height,
            lut_texture,
        }: ApplyLutOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("effects-lut-command-encoder"),
                });

        let output_texture = context.create_render_texture(width, height, "effects-lut-output");
        let source_view = source.create_view(&wgpu::TextureViewDescriptor::default());
        let output_view = output_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let lut_view = lut_texture.create_view(&wgpu::TextureViewDescriptor {
            dimension: Some(wgpu::TextureViewDimension::D3),
            ..Default::default()
        });

        let texture_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("effects-lut-texture-bind-group"),
                layout: context.texture_sampler_bind_group_layout(),
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&source_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                    },
                ],
            });

        let lut3d_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("effects-lut3d-bind-group"),
                layout: &self.lut3d_bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&lut_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                    },
                ],
            });
        {
            // Fullscreen-quad draw: vertex shader positions the quad,
            // fragment shader applies the effect. Bind group 0 = input
            // texture, bind group 1 = per-pass uniform data.
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("effects-lut-render-pass"),
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
            render_pass.set_pipeline(&self.lut3d_pipeline);
            render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
            render_pass.set_bind_group(0, &texture_bind_group, &[]);
            render_pass.set_bind_group(1, &lut3d_bind_group, &[]);
            render_pass.draw(0..6, 0..1);
        }

        context.queue().submit([encoder.finish()]);
        Ok(output_texture)
    }

    // ── Chained Effect Application ──

    /// Apply a chain of effects to the source texture, encoding and submitting GPU work.
    /// Returns the final output texture.
    pub fn apply(
        &self,
        context: &GpuContext,
        ApplyEffectsOptions {
            source,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("effects-command-encoder"),
                });
        let output = self.apply_with_encoder(
            context,
            &mut encoder,
            ApplyEffectsOptions {
                source,
                width,
                height,
                passes,
            },
        )?;
        context.queue().submit([encoder.finish()]);
        Ok(output)
    }

    /// Apply effects using an existing command encoder (for batching with other GPU work).
    /// The caller is responsible for submitting the encoder.
    pub fn apply_with_encoder(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        ApplyEffectsOptions {
            source,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        // The effect chain uses a "ping-pong" approach: each pass reads the
        // output of the previous pass (or the source texture on the first
        // iteration) and renders into a fresh intermediate texture. The last
        // intermediate texture is returned as the final output.
        let mut current_texture: Option<wgpu::Texture> = None;

        for pass in passes {
            let input_texture = current_texture.as_ref().unwrap_or(source);
            let output_texture =
                context.create_render_texture(width, height, "effects-pass-output");
            let input_view = input_texture.create_view(&wgpu::TextureViewDescriptor::default());
            let output_view = output_texture.create_view(&wgpu::TextureViewDescriptor::default());

            // Bind group 0: the input texture (previous pass's output) + linear sampler.
            let texture_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-texture-bind-group"),
                        layout: context.texture_sampler_bind_group_layout(),
                        entries: &[
                            wgpu::BindGroupEntry {
                                binding: 0,
                                resource: wgpu::BindingResource::TextureView(&input_view),
                            },
                            wgpu::BindGroupEntry {
                                binding: 1,
                                resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                            },
                        ],
                    });

            // Pack the pass's uniform parameters into a GPU buffer and bind at group 1.
            let uniform_buffer =
                context
                    .device()
                    .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some("effects-uniform-buffer"),
                        contents: bytemuck::bytes_of(&pack_effect_uniforms(pass, width, height)?),
                        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                    });
            let uniform_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-uniform-bind-group"),
                        layout: &self.uniform_bind_group_layout,
                        entries: &[wgpu::BindGroupEntry {
                            binding: 0,
                            resource: uniform_buffer.as_entire_binding(),
                        }],
                    });
            // Look up the pre-compiled render pipeline for this shader id.
            let pipeline = self.pipelines.get(&pass.shader).ok_or_else(|| {
                EffectsError::UnknownEffectShader {
                    shader: pass.shader.clone(),
                }
            })?;

            {
                let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("effects-render-pass"),
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
                render_pass.set_pipeline(pipeline);
                render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
                render_pass.set_bind_group(0, &texture_bind_group, &[]);
                render_pass.set_bind_group(1, &uniform_bind_group, &[]);
                render_pass.draw(0..6, 0..1);
            }

            current_texture = Some(output_texture);
        }

        current_texture.ok_or(EffectsError::MissingEffectPasses)
    }
}

// ── Uniform Packing ──
// Translates per-pass EffectPass parameters into an EffectUniformBuffer
// that matches the WGSL layout. Each shader reads a subset of the fields;
// unused fields are zeroed.
//
// The `#[allow]` is needed because VHS and CRT both read `u_intensity` + `u_time`,
// causing Clippy to flag the branches as identical across all time-dependent shaders.

#[allow(clippy::if_same_then_else)]
fn pack_effect_uniforms(
    pass: &EffectPass,
    width: u32,
    height: u32,
) -> Result<EffectUniformBuffer, EffectsError> {
    let shader = pass.shader.as_str();

    let mut direction = [0.0, 0.0];
    let mut chroma_color = [0.0, 1.0, 0.0, 1.0]; // Default green
    let mut similarity = 0.4;
    let mut smoothness = 0.1;

    let mut scalars = [0.0, 0.0, 0.0, 0.0];

    if shader == GAUSSIAN_BLUR_SHADER_ID {
        scalars[0] = read_number_uniform(pass, "u_sigma")?;
        scalars[1] = read_number_uniform(pass, "u_step")?;
        direction = read_vec2_uniform(pass, "u_direction")?;
    } else if shader == CHROMA_KEY_SHADER_ID {
        chroma_color = read_vec4_uniform(pass, "u_target_color", [0.0, 1.0, 0.0, 1.0])?;
        similarity = read_number_uniform_with_default(pass, "u_similarity", 0.4)?;
        smoothness = read_number_uniform_with_default(pass, "u_smoothness", 0.1)?;
    } else if shader == GLITCH_SHADER_ID {
        scalars[0] = read_number_uniform_with_default(pass, "u_intensity", 0.5)?;
        scalars[1] = read_number_uniform_with_default(pass, "u_time", 0.0)?;
    } else if shader == COLOR_GRADE_SHADER_ID {
        scalars[0] = read_number_uniform_with_default(pass, "u_exposure", 0.0)?;
        scalars[1] = read_number_uniform_with_default(pass, "u_contrast", 1.0)?;
        scalars[2] = read_number_uniform_with_default(pass, "u_saturation", 1.0)?;
        scalars[3] = read_number_uniform_with_default(pass, "u_temperature", 0.0)?;
    } else if shader == FIRE_SHADER_ID {
        scalars[0] = read_number_uniform_with_default(pass, "u_time", 0.0)?;
        scalars[1] = read_number_uniform_with_default(pass, "u_intensity", 1.0)?;
        scalars[2] = read_number_uniform_with_default(pass, "u_scale", 3.0)?;
    } else if shader == PORTAL_SHADER_ID {
        scalars[0] = read_number_uniform_with_default(pass, "u_time", 0.0)?;
        scalars[1] = read_number_uniform_with_default(pass, "u_intensity", 1.0)?;
        scalars[2] = read_number_uniform_with_default(pass, "u_radius", 0.3)?;
        scalars[3] = read_number_uniform_with_default(pass, "u_swirl_speed", 2.0)?;
    } else if shader == VHS_SHADER_ID {
        scalars[0] = read_number_uniform_with_default(pass, "u_intensity", 1.0)?;
        scalars[1] = read_number_uniform_with_default(pass, "u_time", 0.0)?;
    } else if shader == CRT_SHADER_ID {
        scalars[0] = read_number_uniform_with_default(pass, "u_intensity", 1.0)?;
        scalars[1] = read_number_uniform_with_default(pass, "u_time", 0.0)?;
    }

    Ok(EffectUniformBuffer {
        resolution: [width as f32, height as f32],
        direction,
        scalars,
        chroma_color,
        chroma_thresholds: [similarity, smoothness, 0.0, 0.0],
    })
}

// ── Uniform Value Readers ──
// Type-safe helpers for extracting numeric and vec2/vec4 uniform values
// from the generic EffectPass::uniforms HashMap.

// Reads a required numeric uniform, erroring if missing or non-numeric.
fn read_number_uniform(pass: &EffectPass, uniform: &str) -> Result<f32, EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    match value {
        UniformValue::Number(value) => Ok(*value),
        UniformValue::Vector(_) => Err(EffectsError::InvalidNumberUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        }),
    }
}

// Reads a required vec2 uniform, erroring if missing or not a length-2 vector.
fn read_vec2_uniform(pass: &EffectPass, uniform: &str) -> Result<[f32; 2], EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    let UniformValue::Vector(values) = value else {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 2,
        });
    };
    if values.len() != 2 {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 2,
        });
    }
    Ok([values[0], values[1]])
}

// Reads an optional vec4 (or vec3 + implied alpha) uniform, falling back to a default.
fn read_vec4_uniform(
    pass: &EffectPass,
    uniform: &str,
    default: [f32; 4],
) -> Result<[f32; 4], EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Ok(default);
    };
    let UniformValue::Vector(values) = value else {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 4,
        });
    };
    if values.len() != 4 && values.len() != 3 {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 4,
        });
    }
    let a = if values.len() == 4 { values[3] } else { 1.0 };
    Ok([values[0], values[1], values[2], a])
}

// Reads an optional numeric uniform, falling back to the given default.
fn read_number_uniform_with_default(
    pass: &EffectPass,
    uniform: &str,
    default: f32,
) -> Result<f32, EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Ok(default);
    };
    match value {
        UniformValue::Number(value) => Ok(*value),
        UniformValue::Vector(_) => Err(EffectsError::InvalidNumberUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        }),
    }
}
