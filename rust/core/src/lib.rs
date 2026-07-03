//! Lazynext Core — the central NLE engine.
//!
//! This crate is the brain of Lazynext. It orchestrates all business logic:
//! CRDT-powered timeline state, autonomous editing operations, plugin
//! lifecycle, frame caching, AI client integration, and the ring buffer
//! decoder for high-throughput media playback.
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────┐
//! │                Core Engine                   │
//! │  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
//! │  │ NLEState │  │  Timeline  │  │ Engine  │ │
//! │  │ (CRDT)   │  │ (tracks)   │  │ (orche) │ │
//! │  └──────────┘  └────────────┘  └─────────┘ │
//! │  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
//! │  │ PluginMgr│  │ FrameCache │  │ AI      │ │
//! │  │ (VST3)   │  │ (LRU)      │  │ Client  │ │
//! │  └──────────┘  └────────────┘  └─────────┘ │
//! └─────────────────────────────────────────────┘
//! ```
//!
//! # Platform features
//!
//! - **Native** (`#[cfg(not(target_arch = "wasm32"))]`): FFMPEG loader,
//!   mobile bridge (UniFFI), ring buffer decoder
//! - **WASM** (`#[cfg(target_arch = "wasm32")]`): Lightweight core only;
//!   FFMPEG and mobile features are excluded from WASM builds
//!
//! # Usage
//!
//! The `engine` module is the primary entry point — it ties together state,
//! compositing, AI operations, and export dispatching. See `engine.rs` for
//! the full orchestration surface.

#![allow(
    clippy::needless_borrows_for_generic_args,
    clippy::type_complexity,
    clippy::collapsible_if
)]
pub mod ai_client;
pub mod auto_memory;
#[cfg(not(target_arch = "wasm32"))]
pub mod autonomous;
#[cfg(not(target_arch = "wasm32"))]
pub mod autonomous_agent;
pub mod channels;
pub mod copilot_tools;
pub mod engine;
#[cfg(not(target_arch = "wasm32"))]
pub mod ffmpeg_loader;
pub mod frame_cache;
#[cfg(not(target_arch = "wasm32"))]
pub mod mobile_bridge;
pub mod nle_state;
pub mod plugin_manager;
#[cfg(not(target_arch = "wasm32"))]
pub mod ring_buffer_decoder;
#[cfg(not(target_arch = "wasm32"))]
pub mod scheduled_routines;
pub mod session_portability;
pub mod task_queue;
pub mod timeline;

pub use auto_memory::AutoMemory;
#[cfg(not(target_arch = "wasm32"))]
pub use autonomous::*;
pub use channels::*;
pub use engine::*;
#[cfg(not(target_arch = "wasm32"))]
pub use mobile_bridge::*;
pub use nle_state::*;
pub use plugin_manager::*;
#[cfg(not(target_arch = "wasm32"))]
pub use scheduled_routines::*;
pub use session_portability::*;
pub use task_queue::*;
pub use timeline::*;
