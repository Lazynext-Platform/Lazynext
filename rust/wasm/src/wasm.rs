#[cfg(target_arch = "wasm32")]
mod compositor;
#[cfg(target_arch = "wasm32")]
mod effects;
#[cfg(target_arch = "wasm32")]
mod gpu;
#[cfg(target_arch = "wasm32")]
mod masks;
#[cfg(target_arch = "wasm32")]
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
#[cfg(target_arch = "wasm32")]
pub use perf::*;
#[cfg(target_arch = "wasm32")]
pub use plugin::*;
#[cfg(target_arch = "wasm32")]
pub mod proxy;
#[cfg(target_arch = "wasm32")]
pub use proxy::*;
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

