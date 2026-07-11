//! Lazynext Compositor — wgpu-accelerated NLE rendering engine.
//!
//! The compositor is the visual heart of Lazynext. It takes the CRDT
//! timeline state (tracks, clips, effects, masks) and produces pixel-perfect
//! frames via the GPU. Every frame is rendered through a programmable pipeline
//! of blend modes, effects, and masks — all running on wgpu for cross-platform
//! performance (WebGPU, Vulkan, Metal, DX12).
//!
//! # Pipeline
//!
//! ```text
//! Timeline State → Frame Descriptor → GPU Passes → Output Texture
//!                   ├─ Blend layers
//!                   ├─ Apply effects (11 shaders)
//!                   ├─ Render masks (JFA-SDF)
//!                   └─ Color grading (ACES, 3D LUTs)
//! ```
//!
//! # Modules
//!
//! - **blend_mode**: 17 blend modes (normal, multiply, screen, overlay, etc.)
//! - **compositor**: Main `Compositor` struct — orchestrates frame rendering
//! - **frame**: Frame descriptor types (layers, effects, masks, transforms)
//! - **texture_pool**: GPU texture allocator with LRU eviction
//! - **texture_store**: Persistent texture cache indexed by media ID
//! - **aces**: Academy Color Encoding System transforms
//! - **keyframe**: Deprecated — use `lazynext_state::keyframe` instead (GPU-side keyframe interpolation superseded by the state crate's unified keyframe system)
//! - **lut**: 3D LUT loading, parsing, and GPU application
//! - **msdf**: Multi-channel signed distance field text rendering
//! - **stereoscopic**: Side-by-side / top-bottom 3D output
//! - **transforms3d**: 3D quad transforms (perspective, rotation, scale)

#![allow(clippy::large_enum_variant)]
#![allow(clippy::too_many_arguments)]
mod blend_mode;
mod compositor;
mod frame;
mod texture_pool;
mod texture_store;

pub use blend_mode::BlendMode;
pub use compositor::{Compositor, CompositorError, RenderFrameOptions};
pub use frame::{
    CanvasClearDescriptor, CanvasTextureDescriptor, ColorGradingDescriptor, CropDescriptor,
    EffectPassDescriptor, EffectUniformValueDescriptor, FrameDescriptor, FrameItemDescriptor,
    LayerDescriptor, LayerMaskDescriptor, QuadTransformDescriptor, ShadowDescriptor,
};
pub mod aces;
pub mod keyframe;
pub mod lut;
pub mod msdf;
pub mod stereoscopic;
pub mod transforms3d;
