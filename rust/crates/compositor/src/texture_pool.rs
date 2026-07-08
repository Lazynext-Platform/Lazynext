//! GPU texture pool with per-frame recycling.
//!
//! The texture pool avoids expensive GPU allocations by caching textures
//! keyed by (width, height). After each frame the compositor calls
//! `recycle_frame()` to return in-use textures to the available pool,
//! and `acquire()` retrieves a recycled texture or creates a new one.

use std::collections::HashMap;

use gpu::{GpuContext, wgpu};

type TextureKey = (u32, u32);

/// Recycling pool of render textures keyed by `(width, height)`.
///
/// Reuses GPU textures of the same dimensions across frames to avoid the
/// cost of repeated allocation during compositing.
#[derive(Default)]
pub struct TexturePool {
    /// Recycled textures available for reuse, keyed by dimensions.
    available: HashMap<TextureKey, Vec<wgpu::Texture>>,
    /// Textures acquired during the current frame, awaiting recycling.
    in_use: Vec<(TextureKey, wgpu::Texture)>,
}

impl TexturePool {
    /// Returns all textures acquired this frame to the available pool.
    ///
    /// Call once per frame after compositing completes so their memory can
    /// be reused by the next frame's [`acquire`](Self::acquire) calls.
    pub fn recycle_frame(&mut self) {
        for (key, texture) in self.in_use.drain(..) {
            self.available.entry(key).or_default().push(texture);
        }
    }

    /// Acquires a render texture of the given size, reusing a recycled one
    /// when available or creating a fresh texture otherwise.
    pub fn acquire(
        &mut self,
        context: &GpuContext,
        width: u32,
        height: u32,
        label: &'static str,
    ) -> wgpu::Texture {
        let key = (width, height);
        let texture = self
            .available
            .get_mut(&key)
            .and_then(Vec::pop)
            .unwrap_or_else(|| context.create_render_texture(width, height, label));
        self.in_use.push((key, texture.clone()));
        texture
    }
}
