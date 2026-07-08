//! LRU frame cache decorator — wraps an `AssetLoader` to avoid redundant
//! frame decoding when scrubbing or looping through the timeline.

use crate::engine::AssetLoader;
use lru::LruCache;
use std::future::Future;
use std::num::NonZeroUsize;
use std::pin::Pin;
use std::sync::Arc;
use tokio::sync::Mutex;

/// An `AssetLoader` decorator that caches decoded frames in memory using an LRU cache.
/// This prevents redundant decoding when scrubbing or looping through the timeline.
pub struct FrameCacheLoader {
    /// The wrapped asset loader that decodes frames on a cache miss.
    inner: Arc<dyn AssetLoader>,
    /// Cache key is `(media_id, frame_idx)`. Value is the raw RGBA frame data.
    cache: Arc<Mutex<LruCache<(String, u32), Vec<u8>>>>,
}

impl FrameCacheLoader {
    /// Creates a new `FrameCacheLoader` wrapping the given `AssetLoader`
    /// with a cache of the specified capacity.
    pub fn new(inner: Arc<dyn AssetLoader>, capacity: usize) -> Self {
        let cap = NonZeroUsize::new(capacity).unwrap_or(NonZeroUsize::new(1).unwrap());
        Self {
            inner,
            cache: Arc::new(Mutex::new(LruCache::new(cap))),
        }
    }
}

impl AssetLoader for FrameCacheLoader {
    // Returns the cached frame or delegates to the inner loader and caches it.
    fn load_frame(
        &self,
        media_id: &str,
        frame_idx: u32,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<u8>, String>> + Send>> {
        let media_id = media_id.to_string();
        let inner = Arc::clone(&self.inner);
        let cache = Arc::clone(&self.cache);

        Box::pin(async move {
            let key = (media_id.clone(), frame_idx);

            // Fast path: Check the cache
            {
                let mut cache_guard = cache.lock().await;
                if let Some(frame) = cache_guard.get(&key) {
                    return Ok(frame.clone());
                }
            }

            // Slow path: Delegate to the inner loader
            let frame = inner.load_frame(&media_id, frame_idx).await?;

            // Store the decoded frame in the cache
            {
                let mut cache_guard = cache.lock().await;
                cache_guard.put(key, frame.clone());
            }

            Ok(frame)
        })
    }
}
