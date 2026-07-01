//! Lazynext Masks — GPU-accelerated rotoscoping and segmentation.
//!
//! The masks crate provides three masking approaches for the compositor,
//! from fast real-time signed distance fields to AI-powered segmentation.
//!
//! # Modules
//!
//! - **sdf**: Jump Flood Algorithm (JFA) signed distance fields — generates
//!   anti-aliased mask textures from polygonal paths in real time on the GPU
//! - **feather**: Mask edge feathering — Gaussian blur along mask boundaries
//!   for soft compositing transitions
//! - **sam2**: Segment Anything Model 2 integration — AI-powered automatic
//!   object segmentation via ONNX Runtime, with bounding box and point-prompt
//!   interfaces
//!
//! # Pipeline
//!
//! ```text
//! Polygon Path → JFA-SDF Texture → Feather → Alpha Matte → Compositor Blend
//! SAM2 Prompt  → ONNX Inference ──────────────────────────┘
//! ```

mod feather;
mod sam2;
mod sdf;

pub use feather::{ApplyMaskFeatherOptions, MaskFeatherPipeline};
pub use sam2::{AlphaMatte, BoundingBox, Coordinate, Sam2MaskEngine};
pub use sdf::{SdfPipeline, SignedDistanceFieldTextures};
