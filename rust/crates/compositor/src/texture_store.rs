//! Persistent texture storage keyed by media ID.
//!
//! Unlike the TexturePool (which recycles textures per frame by size),
//! the TextureStore caches decoded media textures by their unique media ID.
//! This avoids re-decoding video frames that haven't changed between
//! compositor frames — critical for timeline scrubbing performance.

use std::collections::HashMap;

use gpu::wgpu;

/// A single GPU texture cached by media ID, owned by the [`TextureStore`].
pub struct StoredTexture {
    /// The cached GPU texture.
    texture: wgpu::Texture,
}

impl StoredTexture {
    /// Wraps an existing GPU texture for storage.
    pub fn new(texture: wgpu::Texture) -> Self {
        Self { texture }
    }

    /// Returns a reference to the underlying GPU texture.
    pub fn texture(&self) -> &wgpu::Texture {
        &self.texture
    }
}

/// Persistent cache mapping media IDs to their decoded GPU textures.
///
/// Textures live here across frames so that unchanged media does not need
/// to be re-decoded and re-uploaded on every compositor pass.
#[derive(Default)]
pub struct TextureStore {
    /// Cached textures keyed by media ID.
    textures: HashMap<String, StoredTexture>,
}

impl TextureStore {
    /// Inserts or replaces the cached texture for the given media `id`.
    pub fn upsert(&mut self, id: String, texture: wgpu::Texture) {
        self.textures.insert(id, StoredTexture::new(texture));
    }

    /// Looks up the cached texture for `id`, if present.
    pub fn get(&self, id: &str) -> Option<&StoredTexture> {
        self.textures.get(id)
    }

    /// Evicts the cached texture for `id`, freeing its GPU memory.
    pub fn remove(&mut self, id: &str) {
        self.textures.remove(id);
    }
}
