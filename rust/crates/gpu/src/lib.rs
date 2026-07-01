//! Lazynext GPU — wgpu device context and shared GPU resources.
//!
//! The GPU crate manages the WebGPU/wgpu lifecycle — adapter selection,
//! device creation, surface configuration, and shared shader resources.
//! It is the foundation that the compositor, effects, and masks crates
//! build upon.
//!
//! # Key types
//!
//! - **`GpuContext`**: Owns the wgpu instance, adapter, device, and queue.
//!   Created once per application session and shared across all GPU consumers.
//! - **`GpuError`**: Typed error enum for adapter unavailability, device
//!   loss, surface format mismatches, and creation failures.
//!
//! # Shared shaders
//!
//! Two built-in WGSL shaders are compiled into the crate:
//! - `fullscreen.wgsl`: Fullscreen quad pass for post-processing
//! - `compositor.wgsl`: Core compositor blend + effect pipeline
//!
//! The `scopes` module provides GPU scope management for RAII-safe
//! encoder and pass scoping.

mod context;

use thiserror::Error;

pub use context::GpuContext;
pub use wgpu;

pub const GPU_TEXTURE_FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Bgra8Unorm;
pub const FULLSCREEN_SHADER_SOURCE: &str = include_str!("shaders/fullscreen.wgsl");
pub const COMPOSITOR_SHADER_SOURCE: &str = include_str!("shaders/compositor.wgsl");

#[derive(Debug, Error)]
pub enum GpuError {
    #[error("No WebGPU adapter is available")]
    AdapterUnavailable,
    #[error("Failed to request a WebGPU device: {0}")]
    RequestDevice(#[from] wgpu::RequestDeviceError),
    #[error("Failed to create a WebGPU surface: {0}")]
    CreateSurface(#[from] wgpu::CreateSurfaceError),
    #[error("The output surface does not support the required texture format")]
    UnsupportedSurfaceFormat,
    #[error("GPU device lost or readback failed: {0}")]
    DeviceLost(String),
}
pub mod scopes;
