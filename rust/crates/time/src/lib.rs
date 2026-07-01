//! Lazynext Time — media time types and multi-camera synchronization.
//!
//! The time crate provides the foundational time primitives used
//! throughout the NLE: frame rates, timecodes, media timestamps,
//! and multi-camera sync clocking.
//!
//! # Modules
//!
//! - **crdt**: CRDT-compatible timestamp types for distributed editing
//! - **multicam**: Multi-camera synchronization — aligns clips by timecode
//!   or audio waveform analysis
//! - **captions**: Subtitle/caption timing — SRT/VTT import, export, and
//!   frame-accurate positioning

pub mod crdt;
pub mod multicam;
pub mod captions;
