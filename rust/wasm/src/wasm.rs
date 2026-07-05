//! WASM crate root — module declarations and re-exports.
//!
//! This is the library entry point for all WASM bindings. Every submodule
//! is conditionally compiled for `wasm32` and re-exported so downstream
//! JavaScript code sees a flat namespace of WASM functions.

#[cfg(target_arch = "wasm32")]
mod compositor;
#[cfg(target_arch = "wasm32")]
mod effects;
#[cfg(target_arch = "wasm32")]
mod gpu;
#[cfg(target_arch = "wasm32")]
mod masks;
#[cfg(target_arch = "wasm32")]
mod perf;
#[cfg(target_arch = "wasm32")]
mod plugin;

#[cfg(target_arch = "wasm32")]
pub use compositor::*;
#[cfg(target_arch = "wasm32")]
pub use effects::*;
#[cfg(target_arch = "wasm32")]
pub use gpu::*;
#[cfg(target_arch = "wasm32")]
pub use masks::*;
#[cfg(target_arch = "wasm32")]
pub use perf::*;
#[cfg(target_arch = "wasm32")]
pub use plugin::*;

#[cfg(target_arch = "wasm32")]
pub mod proxy;
#[cfg(target_arch = "wasm32")]
pub use proxy::*;

#[cfg(target_arch = "wasm32")]
pub use time::*;

#[cfg(target_arch = "wasm32")]
mod state;
#[cfg(target_arch = "wasm32")]
pub use state::*;

#[cfg(target_arch = "wasm32")]
mod neural;
#[cfg(target_arch = "wasm32")]
pub use neural::*;

#[cfg(target_arch = "wasm32")]
mod audio_wasm;
#[cfg(target_arch = "wasm32")]
pub use audio_wasm::*;

#[cfg(target_arch = "wasm32")]
mod crdt_wasm;
#[cfg(target_arch = "wasm32")]
pub use crdt_wasm::*;

#[cfg(target_arch = "wasm32")]
mod crdt_bridge;
#[cfg(target_arch = "wasm32")]
pub use crdt_bridge::*;

#[cfg(target_arch = "wasm32")]
mod export_wasm;
#[cfg(target_arch = "wasm32")]
pub use export_wasm::*;

#[cfg(target_arch = "wasm32")]
mod webcodecs;
#[cfg(target_arch = "wasm32")]
pub use webcodecs::*;

#[cfg(target_arch = "wasm32")]
mod animation_wasm;
#[cfg(target_arch = "wasm32")]
pub use animation_wasm::*;

#[cfg(target_arch = "wasm32")]
mod timeline_wasm;
#[cfg(target_arch = "wasm32")]
pub use timeline_wasm::*;

#[cfg(target_arch = "wasm32")]
mod engine_wasm;
#[cfg(target_arch = "wasm32")]
pub use engine_wasm::*;
