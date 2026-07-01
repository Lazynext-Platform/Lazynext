//! Persistent texture storage keyed by media ID.
//!
//! Unlike the TexturePool (which recycles textures per frame by size),
//! the TextureStore caches decoded media textures by their unique media ID.
//! This avoids re-decoding video frames that haven't changed between
//! compositor frames — critical for timeline scrubbing performance.

use std::collections::HashMap;

use gpu::wgpu;

pub struct StoredTexture {
    texture: wgpu::Texture,
}

impl StoredTexture {
    pub fn new(texture: wgpu::Texture) -> Self {
        Self { texture }
    }

    pub fn texture(&self) -> &wgpu::Texture {
        &self.texture
    }
}

#[derive(Default)]
pub struct TextureStore {
    textures: HashMap<String, StoredTexture>,
}

impl TextureStore {
    pub fn upsert(&mut self, id: String, texture: wgpu::Texture) {
        self.textures.insert(id, StoredTexture::new(texture));
    }

    pub fn get(&self, id: &str) -> Option<&StoredTexture> {
        self.textures.get(id)
    }

    pub fn remove(&mut self, id: &str) {
        self.textures.remove(id);
    }
}
