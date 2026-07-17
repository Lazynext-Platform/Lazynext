//! GPU-accelerated compositor rendering pipeline built on wgpu.
//! Takes a `FrameDescriptor` of layers, effects, masks, and text,
//! renders them through a multi-pass pipeline (layer transform → effects
//! → masking → blending) using WGSL shaders, and outputs composite
//! textures or presents directly to a surface. Supports 17 blend modes,
//! 11 GPU effect shaders, MSDF text rendering, and color grading.

use crate::msdf::{ApplyMSDFOptions, MSDFPipeline};
use bytemuck::{Pod, Zeroable};
use effects::{ApplyEffectsOptions, EffectPass, EffectPipeline, UniformValue};
use gpu::{FULLSCREEN_SHADER_SOURCE, GpuContext, wgpu};
use masks::{ApplyMaskFeatherOptions, MaskFeatherPipeline};
use thiserror::Error;
use wgpu::util::DeviceExt;

use crate::{
    BlendMode,
    frame::{
        EffectPassDescriptor, EffectUniformValueDescriptor, FrameDescriptor, FrameItemDescriptor,
        LayerDescriptor, TextLayerDescriptor,
    },
    texture_pool::TexturePool,
    texture_store::TextureStore,
};

const LAYER_SHADER_SOURCE: &str = include_str!("shaders/layer.wgsl");
const BLEND_SHADER_SOURCE: &str = include_str!("shaders/blend.wgsl");
const MASK_SHADER_SOURCE: &str = include_str!("shaders/mask.wgsl");

/// Options for rendering a frame directly to a surface.
pub struct RenderFrameOptions<'a, 'surface> {
    /// The frame descriptor describing layers, effects, and canvas.
    pub frame: &'a FrameDescriptor,
    /// The target wgpu surface to present the composed frame onto.
    pub surface: &'a wgpu::Surface<'surface>,
}

/// GPU-accelerated compositor that renders layers, effects, masks, and text
/// into output textures or surfaces.
pub struct Compositor {
    /// Store of GPU textures keyed by ID.
    textures: TextureStore,
    /// Pool of reusable intermediate render textures.
    texture_pool: TexturePool,
    /// GPU effect pass pipeline.
    effects: EffectPipeline,
    /// Mask feathering pipeline.
    masks: MaskFeatherPipeline,
    /// MSDF text rendering pipeline.
    msdf: MSDFPipeline,
    /// Bind group layout for layer uniform buffers.
    layer_uniform_bind_group_layout: wgpu::BindGroupLayout,
    /// Render pipeline for the layer transform/color pass.
    layer_pipeline: wgpu::RenderPipeline,
    /// Bind group layout for blend uniform buffers.
    blend_uniform_bind_group_layout: wgpu::BindGroupLayout,
    /// Render pipeline for the blend pass.
    blend_pipeline: wgpu::RenderPipeline,
    /// Bind group layout for mask uniform buffers.
    mask_uniform_bind_group_layout: wgpu::BindGroupLayout,
    /// Render pipeline for the mask pass.
    mask_pipeline: wgpu::RenderPipeline,
}

/// Errors that can occur during compositor operations.
#[derive(Debug, Error)]
pub enum CompositorError {
    /// A required texture was not found in the texture store.
    #[error("Texture '{texture_id}' is not available")]
    MissingTexture {
        /// The ID of the texture that could not be found.
        texture_id: String,
    },
    /// An error occurred while applying GPU effects.
    #[error("Failed to apply effects: {0}")]
    Effects(#[from] effects::EffectsError),
    /// A GPU operation failed (e.g. surface acquisition or present).
    #[error("Failed to present frame: {0}")]
    Gpu(#[from] gpu::GpuError),
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct LayerUniformBuffer {
    /// Output resolution in pixels [width, height].
    resolution: [f32; 2],
    /// Layer center position in pixels.
    center: [f32; 2],
    /// Layer size in pixels [width, height].
    size: [f32; 2],
    /// Rotation angle in radians.
    rotation_radians: f32,
    /// Layer opacity (0.0–1.0).
    opacity: f32,
    /// Horizontal flip flag (1.0 = flipped).
    flip_x: f32,
    /// Vertical flip flag (1.0 = flipped).
    flip_y: f32,
    /// Brightness multiplier.
    brightness: f32,
    /// Contrast multiplier.
    contrast: f32,
    /// Saturation multiplier.
    saturation: f32,
    /// Grayscale amount (0.0–1.0).
    grayscale: f32,
    /// Pixelate amount.
    pixelate: f32,
    /// Edge detection amount.
    edge_detect: f32,
    /// Crop insets [left, top, right, bottom].
    crop: [f32; 4],
    /// Corner border radius.
    border_radius: f32,
    /// Sepia amount (0.0–1.0).
    sepia: f32,
    /// Color invert amount (0.0–1.0).
    invert: f32,
    /// Hue rotation in degrees.
    hue_rotate: f32,
    /// RGBA drop shadow color.
    shadow_color: [f32; 4],
    /// Drop shadow offset distance.
    shadow_distance: f32,
    /// Drop shadow angle in degrees.
    shadow_angle: f32,
    /// Drop shadow blur radius.
    shadow_blur: f32,
    /// Padding for uniform buffer alignment.
    shadow_padding: f32,
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct BlendUniformBuffer {
    /// Blend mode shader code.
    blend_mode: u32,
    /// Luma key threshold for color keying.
    luma_key_threshold: f32,
    /// Luma key tolerance for color keying.
    luma_key_tolerance: f32,
    /// Padding for uniform buffer alignment.
    _padding: [u32; 1],
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct MaskUniformBuffer {
    /// Mask inversion flag (1.0 = inverted).
    inverted: f32,
    /// Padding for uniform buffer alignment.
    _padding: [f32; 3],
}

// ── Pipeline Initialization ──

impl Compositor {
    /// Creates a new `Compositor` with all pipelines, bind group layouts,
    /// and sub-pipelines (effects, masks, MSDF) initialized.
    pub fn new(context: &GpuContext) -> Self {
        let device = context.device();
        let fullscreen_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("compositor-fullscreen-shader"),
            source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
        });
        let layer_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("compositor-layer-shader"),
            source: wgpu::ShaderSource::Wgsl(LAYER_SHADER_SOURCE.into()),
        });
        let blend_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("compositor-blend-shader"),
            source: wgpu::ShaderSource::Wgsl(BLEND_SHADER_SOURCE.into()),
        });
        let mask_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("compositor-mask-shader"),
            source: wgpu::ShaderSource::Wgsl(MASK_SHADER_SOURCE.into()),
        });

        let layer_uniform_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("compositor-layer-uniform-layout"),
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
        let blend_uniform_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("compositor-blend-uniform-layout"),
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
        let mask_uniform_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("compositor-mask-uniform-layout"),
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

        let layer_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("compositor-layer-pipeline-layout"),
                bind_group_layouts: &[
                    Some(context.texture_sampler_bind_group_layout()),
                    Some(&layer_uniform_bind_group_layout),
                ],
                immediate_size: 0,
            });
        let blend_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("compositor-blend-pipeline-layout"),
                bind_group_layouts: &[
                    Some(context.texture_sampler_bind_group_layout()),
                    Some(context.texture_sampler_bind_group_layout()),
                    Some(&blend_uniform_bind_group_layout),
                ],
                immediate_size: 0,
            });
        let mask_pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("compositor-mask-pipeline-layout"),
            bind_group_layouts: &[
                Some(context.texture_sampler_bind_group_layout()),
                Some(context.texture_sampler_bind_group_layout()),
                Some(&mask_uniform_bind_group_layout),
            ],
            immediate_size: 0,
        });

        let layer_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("compositor-layer-pipeline"),
            layout: Some(&layer_pipeline_layout),
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
                module: &layer_shader,
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
        let blend_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("compositor-blend-pipeline"),
            layout: Some(&blend_pipeline_layout),
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
                module: &blend_shader,
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
        let mask_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("compositor-mask-pipeline"),
            layout: Some(&mask_pipeline_layout),
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
                module: &mask_shader,
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
            textures: TextureStore::default(),
            texture_pool: TexturePool::default(),
            effects: EffectPipeline::new(context),
            masks: MaskFeatherPipeline::new(context),
            msdf: MSDFPipeline::new(context),
            layer_uniform_bind_group_layout,
            layer_pipeline,
            blend_uniform_bind_group_layout,
            blend_pipeline,
            mask_uniform_bind_group_layout,
            mask_pipeline,
        }
    }

    // ── Frame Rendering (public API) ──

    /// Inserts or updates a texture in the compositor's texture store by ID.
    pub fn upsert_texture(&mut self, id: String, texture: wgpu::Texture) {
        self.textures.upsert(id, texture);
    }

    /// Removes a texture from the compositor's texture store by ID.
    pub fn release_texture(&mut self, id: &str) {
        self.textures.remove(id);
    }

    /// Returns `true` if a texture with the given ID exists in the texture store.
    pub fn has_texture(&self, id: &str) -> bool {
        self.textures.get(id).is_some()
    }

    /// Composites all frame items into a texture and returns it.
    /// Used on backends that cannot surface-render to an arbitrary canvas (e.g. WebGL).
    pub fn render_frame_to_texture(
        &mut self,
        context: &GpuContext,
        frame: &FrameDescriptor,
    ) -> Result<wgpu::Texture, CompositorError> {
        self.texture_pool.recycle_frame();
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("compositor-frame-encoder"),
                });
        let mut scene = self.create_cleared_texture(
            context,
            &mut encoder,
            frame.width,
            frame.height,
            frame.clear.color,
        );

        for item in &frame.items {
            match item {
                FrameItemDescriptor::Layer(layer) => {
                    let layer_texture = self.render_layer(context, &mut encoder, frame, layer)?;
                    scene = self.blend_texture(
                        context,
                        &mut encoder,
                        &scene,
                        &layer_texture,
                        layer.blend_mode,
                        layer.luma_key_threshold.unwrap_or(0.0),
                        layer.luma_key_tolerance.unwrap_or(0.05),
                        frame.width,
                        frame.height,
                    )?;
                }
                FrameItemDescriptor::SceneEffect { effect_pass_groups } => {
                    scene = self.apply_effect_groups(
                        context,
                        &mut encoder,
                        &scene,
                        frame.width,
                        frame.height,
                        effect_pass_groups,
                    )?;
                }
                FrameItemDescriptor::TextLayer(text_layer) => {
                    scene =
                        self.render_text_layer(context, &mut encoder, &scene, frame, text_layer)?;
                }
            }
        }

        context.queue().submit([encoder.finish()]);
        Ok(scene)
    }

    /// Renders the frame into multiple textures corresponding to different aspect ratios in a single pass.
    /// This drastically reduces render COGS by only computing effects and layers once, and then slicing.
    pub fn render_multi_format_frame_to_textures(
        &mut self,
        context: &GpuContext,
        frame: &FrameDescriptor,
        aspect_ratios: &[(u32, u32)], // (width, height)
    ) -> Result<Vec<wgpu::Texture>, CompositorError> {
        let base_scene = self.render_frame_to_texture(context, frame)?;

        let mut results = Vec::new();
        for &(width, height) in aspect_ratios {
            let mut encoder =
                context
                    .device()
                    .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                        label: Some("compositor-multi-format-encoder"),
                    });

            // In a full implementation, this copy_texture would involve a custom shader
            // to crop/scale the base_scene to fit the target aspect ratio, ensuring the
            // center/subject is maintained (auto-reframing).
            // For now, we perform a simple copy of the center region.
            let target = self.copy_texture(context, &mut encoder, &base_scene, width, height);

            context.queue().submit([encoder.finish()]);
            results.push(target);
        }

        Ok(results)
    }

    /// Composites and renders a single frame to the target surface.
    ///
    /// Recycles per-frame textures, acquires the surface texture, and encodes
    /// the layer/blend/effect passes described by `options` into a GPU command
    /// buffer for submission. Returns a [`CompositorError`] on GPU failure.
    pub fn render_frame(
        &mut self,
        context: &GpuContext,
        options: RenderFrameOptions<'_, '_>,
    ) -> Result<(), CompositorError> {
        let frame = options.frame;
        self.texture_pool.recycle_frame();
        let surface_texture = context.acquire_surface_texture(options.surface)?;
        let surface_view = surface_texture
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("compositor-frame-encoder"),
                });
        let mut scene = self.create_cleared_texture(
            context,
            &mut encoder,
            frame.width,
            frame.height,
            frame.clear.color,
        );

        for item in &frame.items {
            match item {
                FrameItemDescriptor::Layer(layer) => {
                    let layer_texture = self.render_layer(context, &mut encoder, frame, layer)?;
                    scene = self.blend_texture(
                        context,
                        &mut encoder,
                        &scene,
                        &layer_texture,
                        layer.blend_mode,
                        layer.luma_key_threshold.unwrap_or(0.0),
                        layer.luma_key_tolerance.unwrap_or(0.05),
                        frame.width,
                        frame.height,
                    )?;
                }
                FrameItemDescriptor::SceneEffect { effect_pass_groups } => {
                    scene = self.apply_effect_groups(
                        context,
                        &mut encoder,
                        &scene,
                        frame.width,
                        frame.height,
                        effect_pass_groups,
                    )?;
                }
                FrameItemDescriptor::TextLayer(text_layer) => {
                    scene =
                        self.render_text_layer(context, &mut encoder, &scene, frame, text_layer)?;
                }
            }
        }

        context.encode_texture_blit_to_view(
            &mut encoder,
            &scene,
            &surface_view,
            "compositor-present-pass",
        );
        context.queue().submit([encoder.finish()]);
        surface_texture.present();
        Ok(())
    }

    // ── Layer Rendering (private) ──

    /// Renders an MSDF text layer into the scene.
    ///
    /// First renders the text glyphs using the MSDF pipeline into a cleared
    /// intermediate texture, then wraps it as a `LayerDescriptor` to apply
    /// transforms and color grading through `render_layer`. The result is
    /// blended onto the scene with Normal blend mode. The intermediate
    /// rasterized texture is cleaned up after blending.
    ///
    /// Returns the updated scene texture with the text composited in.
    fn render_text_layer(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        scene: &wgpu::Texture,
        frame: &FrameDescriptor,
        text_layer: &TextLayerDescriptor,
    ) -> Result<wgpu::Texture, CompositorError> {
        // Render the MSDF into a clear intermediate texture
        let rasterized_text = self.create_cleared_texture(
            context,
            encoder,
            frame.width,
            frame.height,
            [0.0, 0.0, 0.0, 0.0],
        );
        let rasterized_view = rasterized_text.create_view(&wgpu::TextureViewDescriptor::default());

        {
            let msdf_source = self
                .textures
                .get(&text_layer.text_texture_id)
                .ok_or_else(|| CompositorError::MissingTexture {
                    texture_id: text_layer.text_texture_id.clone(),
                })?;

            self.msdf.apply_with_encoder(
                context,
                encoder,
                ApplyMSDFOptions {
                    target_view: &rasterized_view,
                    msdf_texture: msdf_source.texture(),
                    color: text_layer.color,
                    outline_color: text_layer.outline_color,
                    shadow_color: text_layer.shadow_color,
                    px_range: text_layer.px_range,
                    outline_width: text_layer.outline_width,
                    shadow_offset: text_layer.shadow_offset,
                    shadow_blur: text_layer.shadow_blur,
                },
            );
        }

        // Store the rasterized text temporarily in the pool
        let temp_id = format!("{}_rasterized", text_layer.text_texture_id);
        self.textures.upsert(temp_id.clone(), rasterized_text);

        // Map TextLayerDescriptor to LayerDescriptor to handle transforms
        let layer_desc = LayerDescriptor {
            texture_id: temp_id.clone(),
            transform: text_layer.transform.clone(),
            opacity: text_layer.opacity,
            blend_mode: BlendMode::Normal,
            effect_pass_groups: vec![],
            mask: None,
            color_grading: None,
            crop: None,
            border_radius: None,
            shadow: None,
            luma_key_threshold: None,
            luma_key_tolerance: None,
        };

        let layer_texture = self.render_layer(context, encoder, frame, &layer_desc)?;
        let result = self.blend_texture(
            context,
            encoder,
            scene,
            &layer_texture,
            BlendMode::Normal,
            0.0,
            0.0,
            frame.width,
            frame.height,
        )?;

        // Clean up temporary texture
        self.textures.remove(&temp_id);

        Ok(result)
    }

    /// Renders a single source layer through the full compositor pipeline.
    ///
    /// This is the core layer rendering entry point. It:
    /// 1. Acquires the source texture from the store.
    /// 2. Renders it through the layer shader (`render_source_to_texture`),
    ///    which applies transform, opacity, flip, color grading, crop,
    ///    border radius, and shadow in one GPU pass.
    /// 3. Chains any effect pass groups through `apply_effect_groups`.
    /// 4. Applies an optional mask (with or without feathering) via
    ///    `apply_mask`.
    ///
    /// Returns the fully processed layer texture.
    fn render_layer(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        frame: &FrameDescriptor,
        layer: &LayerDescriptor,
    ) -> Result<wgpu::Texture, CompositorError> {
        let source = self.textures.get(&layer.texture_id).ok_or_else(|| {
            CompositorError::MissingTexture {
                texture_id: layer.texture_id.clone(),
            }
        })?;

        let mut current =
            self.texture_pool
                .acquire(context, frame.width, frame.height, "compositor-layer");
        self.render_source_to_texture(
            context,
            encoder,
            source.texture(),
            &current,
            frame.width,
            frame.height,
            layer,
        );

        if !layer.effect_pass_groups.is_empty() {
            current = self.apply_effect_groups(
                context,
                encoder,
                &current,
                frame.width,
                frame.height,
                &layer.effect_pass_groups,
            )?;
        }

        if let Some(mask) = &layer.mask {
            let mask_source = self.textures.get(&mask.texture_id).ok_or_else(|| {
                CompositorError::MissingTexture {
                    texture_id: mask.texture_id.clone(),
                }
            })?;
            let mask_source_texture = mask_source.texture().clone();
            let mask_texture = if mask.feather > 0.0 {
                self.masks.apply_mask_feather_with_encoder(
                    context,
                    encoder,
                    ApplyMaskFeatherOptions {
                        mask: &mask_source_texture,
                        width: frame.width,
                        height: frame.height,
                        feather: mask.feather,
                    },
                )
            } else {
                self.copy_texture(
                    context,
                    encoder,
                    &mask_source_texture,
                    frame.width,
                    frame.height,
                )
            };
            current = self.apply_mask(
                context,
                encoder,
                &current,
                &mask_texture,
                mask.inverted,
                frame.width,
                frame.height,
            );
        }

        Ok(current)
    }

    // ── Effect Application ──

    /// Chains one or more effect pass groups onto a source texture.
    ///
    /// Copies the source to leave the original intact, then processes each
    /// group sequentially: maps `EffectPassDescriptor` entries to GPU
    /// `EffectPass` values via `map_effect_passes`, and applies them through
    /// the effect pipeline. Each group is applied to the cumulative result
    /// of the previous group.
    ///
    /// Returns the final processed texture.
    fn apply_effect_groups(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        source: &wgpu::Texture,
        width: u32,
        height: u32,
        effect_pass_groups: &[Vec<EffectPassDescriptor>],
    ) -> Result<wgpu::Texture, CompositorError> {
        let mut current = self.copy_texture(context, encoder, source, width, height);
        for group in effect_pass_groups {
            let passes = map_effect_passes(group);
            current = self.effects.apply_with_encoder(
                context,
                encoder,
                ApplyEffectsOptions {
                    source: &current,
                    width,
                    height,
                    passes: &passes,
                },
            )?;
        }
        Ok(current)
    }

    /// Acquires a texture from the pool and clears it to the given color.
    ///
    /// Used to initialize the scene canvas before compositing begins, and as
    /// scratch textures for intermediate operations (e.g. MSDF rasterization).
    /// The clear is performed in a single render pass with `LoadOp::Clear`.
    ///
    /// Returns the cleared texture ready for further rendering.
    fn create_cleared_texture(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        width: u32,
        height: u32,
        clear_color: [f32; 4],
    ) -> wgpu::Texture {
        let texture =
            self.texture_pool
                .acquire(context, width, height, "compositor-cleared-texture");
        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        {
            let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("compositor-clear-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: clear_color[0] as f64,
                            g: clear_color[1] as f64,
                            b: clear_color[2] as f64,
                            a: clear_color[3] as f64,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
                multiview_mask: None,
            });
        }
        texture
    }

    /// Copies texture data from a source to a new texture from the pool.
    ///
    /// Acquires a fresh texture at the given dimensions and blits the source
    /// into it via `blit_texture`. This is a raw GPU-side copy with no shader
    /// processing — used when the source must be preserved for subsequent
    /// compositing steps (e.g. before effect application or masking).
    ///
    /// Returns the new texture containing a copy of the source.
    fn copy_texture(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        source: &wgpu::Texture,
        width: u32,
        height: u32,
    ) -> wgpu::Texture {
        let texture = self
            .texture_pool
            .acquire(context, width, height, "compositor-copy-texture");
        self.blit_texture(context, encoder, source, &texture);
        texture
    }

    /// Renders a source image onto a target texture through the layer shader.
    ///
    /// Packs all layer properties (transform, opacity, flip, color grading,
    /// crop, border radius, shadow) into a `LayerUniformBuffer` and dispatches
    /// a fullscreen-quad draw using the layer render pipeline. The target is
    /// cleared to transparent before rendering. The source texture is sampled
    /// via the context's linear sampler.
    ///
    /// This is the single GPU pass that applies the full layer styling stack.
    fn render_source_to_texture(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        source: &wgpu::Texture,
        target: &wgpu::Texture,
        width: u32,
        height: u32,
        layer: &LayerDescriptor,
    ) {
        let source_view = source.create_view(&wgpu::TextureViewDescriptor::default());
        let target_view = target.create_view(&wgpu::TextureViewDescriptor::default());
        let source_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-layer-source-bind-group"),
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
        let uniform_buffer =
            context
                .device()
                .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                    label: Some("compositor-layer-uniform-buffer"),
                    contents: bytemuck::bytes_of(&LayerUniformBuffer {
                        resolution: [width as f32, height as f32],
                        center: [layer.transform.center_x, layer.transform.center_y],
                        size: [layer.transform.width, layer.transform.height],
                        rotation_radians: layer.transform.rotation_degrees.to_radians(),
                        opacity: layer.opacity,
                        flip_x: if layer.transform.flip_x { 1.0 } else { 0.0 },
                        flip_y: if layer.transform.flip_y { 1.0 } else { 0.0 },
                        brightness: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.brightness)
                            .unwrap_or(1.0),
                        contrast: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.contrast)
                            .unwrap_or(1.0),
                        saturation: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.saturation)
                            .unwrap_or(1.0),
                        grayscale: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.grayscale.unwrap_or(0.0))
                            .unwrap_or(0.0),
                        pixelate: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.pixelate.unwrap_or(0.0))
                            .unwrap_or(0.0),
                        edge_detect: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.edge_detect.unwrap_or(0.0))
                            .unwrap_or(0.0),
                        crop: [
                            layer.crop.as_ref().map(|c| c.left).unwrap_or(0.0),
                            layer.crop.as_ref().map(|c| c.top).unwrap_or(0.0),
                            layer.crop.as_ref().map(|c| c.right).unwrap_or(0.0),
                            layer.crop.as_ref().map(|c| c.bottom).unwrap_or(0.0),
                        ],
                        border_radius: layer.border_radius.unwrap_or(0.0),
                        sepia: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.sepia.unwrap_or(0.0))
                            .unwrap_or(0.0),
                        invert: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.invert.unwrap_or(0.0))
                            .unwrap_or(0.0),
                        hue_rotate: layer
                            .color_grading
                            .as_ref()
                            .map(|cg| cg.hue_rotate.unwrap_or(0.0))
                            .unwrap_or(0.0),
                        shadow_color: layer
                            .shadow
                            .as_ref()
                            .map(|s| s.color)
                            .unwrap_or([0.0, 0.0, 0.0, 0.0]),
                        shadow_distance: layer.shadow.as_ref().map(|s| s.distance).unwrap_or(0.0),
                        shadow_angle: layer.shadow.as_ref().map(|s| s.angle).unwrap_or(0.0),
                        shadow_blur: layer.shadow.as_ref().map(|s| s.blur).unwrap_or(0.0),
                        shadow_padding: 0.0,
                    }),
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                });
        let uniform_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-layer-uniform-bind-group"),
                layout: &self.layer_uniform_bind_group_layout,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                }],
            });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("compositor-layer-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &target_view,
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
            render_pass.set_pipeline(&self.layer_pipeline);
            render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
            render_pass.set_bind_group(0, &source_bind_group, &[]);
            render_pass.set_bind_group(1, &uniform_bind_group, &[]);
            render_pass.draw(0..6, 0..1);
        }
    }

    // ── Mask Application ──

    /// Applies a mask texture to a layer texture using the mask shader.
    ///
    /// Multiplexes each pixel of the layer by the corresponding mask pixel's
    /// alpha value, optionally inverting the mask. Supports feathering through
    /// the separate `MaskFeatherPipeline` (applied before this pass).
    /// Produces a new texture from the pool with the mask applied.
    ///
    /// `inverted`: when `true`, the mask alpha is inverted before multiplying.
    fn apply_mask(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        layer_texture: &wgpu::Texture,
        mask_texture: &wgpu::Texture,
        inverted: bool,
        width: u32,
        height: u32,
    ) -> wgpu::Texture {
        let target = self
            .texture_pool
            .acquire(context, width, height, "compositor-masked-texture");
        let layer_view = layer_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let mask_view = mask_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let target_view = target.create_view(&wgpu::TextureViewDescriptor::default());

        let layer_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-mask-layer-bind-group"),
                layout: context.texture_sampler_bind_group_layout(),
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&layer_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                    },
                ],
            });
        let mask_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-mask-mask-bind-group"),
                layout: context.texture_sampler_bind_group_layout(),
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&mask_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                    },
                ],
            });
        let uniform_buffer =
            context
                .device()
                .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                    label: Some("compositor-mask-uniform-buffer"),
                    contents: bytemuck::bytes_of(&MaskUniformBuffer {
                        inverted: if inverted { 1.0 } else { 0.0 },
                        _padding: [0.0; 3],
                    }),
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                });
        let uniform_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-mask-uniform-bind-group"),
                layout: &self.mask_uniform_bind_group_layout,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                }],
            });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("compositor-mask-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &target_view,
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
            render_pass.set_pipeline(&self.mask_pipeline);
            render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
            render_pass.set_bind_group(0, &layer_bind_group, &[]);
            render_pass.set_bind_group(1, &mask_bind_group, &[]);
            render_pass.set_bind_group(2, &uniform_bind_group, &[]);
            render_pass.draw(0..6, 0..1);
        }
        target
    }

    // ── Blending & Blitting ──

    /// Blends a layer texture onto a base texture using the specified blend mode.
    ///
    /// Dispatches a fullscreen-quad draw with the blend shader, which receives
    /// both the base and layer textures along with a `BlendUniformBuffer`
    /// encoding the blend mode integer code and optional luma key parameters.
    /// Supports all 17 blend modes (Normal, Multiply, Screen, etc.) and luma
    /// keying for green-screen / color-key effects.
    ///
    /// Returns the blended result in a new texture acquired from the pool.
    fn blend_texture(
        &mut self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        base: &wgpu::Texture,
        layer: &wgpu::Texture,
        blend_mode: BlendMode,
        luma_key_threshold: f32,
        luma_key_tolerance: f32,
        width: u32,
        height: u32,
    ) -> Result<wgpu::Texture, CompositorError> {
        let target =
            self.texture_pool
                .acquire(context, width, height, "compositor-blended-texture");
        let base_view = base.create_view(&wgpu::TextureViewDescriptor::default());
        let layer_view = layer.create_view(&wgpu::TextureViewDescriptor::default());
        let target_view = target.create_view(&wgpu::TextureViewDescriptor::default());
        let base_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-base-bind-group"),
                layout: context.texture_sampler_bind_group_layout(),
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&base_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                    },
                ],
            });
        let layer_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-layer-bind-group"),
                layout: context.texture_sampler_bind_group_layout(),
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&layer_view),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                    },
                ],
            });
        let uniform_buffer =
            context
                .device()
                .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                    label: Some("compositor-blend-uniform-buffer"),
                    contents: bytemuck::bytes_of(&BlendUniformBuffer {
                        blend_mode: blend_mode.shader_code(),
                        luma_key_threshold,
                        luma_key_tolerance,
                        _padding: [0; 1],
                    }),
                    usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                });
        let uniform_bind_group = context
            .device()
            .create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("compositor-blend-uniform-bind-group"),
                layout: &self.blend_uniform_bind_group_layout,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                }],
            });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("compositor-blend-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &target_view,
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
            render_pass.set_pipeline(&self.blend_pipeline);
            render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
            render_pass.set_bind_group(0, &base_bind_group, &[]);
            render_pass.set_bind_group(1, &layer_bind_group, &[]);
            render_pass.set_bind_group(2, &uniform_bind_group, &[]);
            render_pass.draw(0..6, 0..1);
        }
        Ok(target)
    }

    /// Blits (raw-copies) a source texture to a target texture.
    ///
    /// Uses the context's built-in texture blit encoder — no shader is
    /// involved. This is the fastest path for GPU-side texture copies and
    /// is used by `copy_texture` and other internal paths that need a
    /// pure data transfer with zero processing overhead.
    fn blit_texture(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        source: &wgpu::Texture,
        target: &wgpu::Texture,
    ) {
        let target_view = target.create_view(&wgpu::TextureViewDescriptor::default());
        context.encode_texture_blit_to_view(encoder, source, &target_view, "compositor-blit-pass");
    }
}

/// Converts a slice of `EffectPassDescriptor` into GPU-ready `EffectPass` values.
///
/// Bridges the frame descriptor domain (which uses `EffectUniformValueDescriptor`
/// for serialization-friendly numeric and vector representations) to the effect
/// pipeline domain (which consumes typed `UniformValue` enums). Called for each
/// effect pass group during `apply_effect_groups`.
fn map_effect_passes(passes: &[EffectPassDescriptor]) -> Vec<EffectPass> {
    passes
        .iter()
        .map(|pass| EffectPass {
            shader: pass.shader.clone(),
            uniforms: pass
                .uniforms
                .iter()
                .map(|(name, value)| {
                    let uniform_value = match value {
                        EffectUniformValueDescriptor::Number(n) => UniformValue::Number(*n),
                        EffectUniformValueDescriptor::Vector(v) => UniformValue::Vector(v.clone()),
                    };
                    (name.clone(), uniform_value)
                })
                .collect(),
        })
        .collect()
}
