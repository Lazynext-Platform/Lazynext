//! Lazynext Effects — 11 GPU effect shaders for the compositor.
//!
//! The effects crate provides real-time GPU-accelerated visual effects
//! that run as part of the compositor's render pipeline. Each effect is
//! implemented as a WGSL compute/render shader dispatched via wgpu.
//!
//! # Effect passes
//!
//! | Effect | Description |
//! |--------|-------------|
//! | Chromatic Aberration | RGB channel separation at screen edges |
//! | Vignette | Radial darkening toward frame corners |
//! | Film Grain | Physically-based film stock grain simulation |
//! | Bloom | Gaussian luminance bloom with threshold |
//! | Glitch | Randomized block displacement + RGB shift |
//! | Pixelate | Downsample → upsample blocky look |
//! | Sharpen | Unsharp mask convolution |
//! | Blur | Separable Gaussian blur (horizontal + vertical) |
//! | Color Matrix | 4×4 color transform (sepia, tint, etc.) |
//! | Noise | Per-frame random noise overlay |
//! | Optical Flow | Dense motion vector estimation for retiming |
//!
//! # Architecture
//!
//! The `EffectPipeline` (in `pipeline.rs`) is the single entry point.
//! It batches multiple effects into a single GPU command encoder for
//! optimal performance, applying them in order to the compositor's
//! output texture.

#![allow(
    clippy::unnecessary_cast,
    clippy::too_many_arguments,
    clippy::cast_abs_to_unsigned
)]

pub mod film_physics;
pub mod optical_flow;
mod pipeline;
mod types;

pub use pipeline::{ApplyEffectsOptions, ApplyLutOptions, EffectPipeline, EffectsError};
pub use types::{EffectPass, UniformValue};
