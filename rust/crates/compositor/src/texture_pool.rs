//! GPU texture pool with per-frame recycling.
//!
//! The texture pool avoids expensive GPU allocations by caching textures
//! keyed by (width, height). After each frame the compositor calls
//! `recycle_frame()` to return in-use textures to the available pool,
//! and `acquire()` retrieves a recycled texture or creates a new one.

use std::collections::HashMap;

use gpu::{GpuContext, wgpu};

type TextureKey = (u32, u32);

#[derive(Default)]
pub struct TexturePool {
    available: HashMap<TextureKey, Vec<wgpu::Texture>>,
    in_use: Vec<(TextureKey, wgpu::Texture)>,
}

impl TexturePool {
    pub fn recycle_frame(&mut self) {
        for (key, texture) in self.in_use.drain(..) {
            self.available.entry(key).or_default().push(texture);
        }
    }

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
