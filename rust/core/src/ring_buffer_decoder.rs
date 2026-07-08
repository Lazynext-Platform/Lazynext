//! Ring-buffer decoder that maintains continuous FFmpeg decoding streams with
//! LRU frame caching and asynchronous seek support via `AssetLoader`.

use crate::engine::AssetLoader;
use lru::LruCache;
use std::collections::HashMap;
use std::future::Future;
use std::io::Read;
use std::num::NonZeroUsize;
use std::pin::Pin;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::sync::atomic::{AtomicU32, Ordering};
use tokio::sync::Mutex;
use tokio::sync::mpsc;

/// Sanitize a media path to prevent path traversal and flag injection.
fn sanitize_media_path(path: &str) -> String {
    path.trim_start_matches('-')
        .trim()
        .replace("../", "")
        .replace("..\\", "")
        .to_string()
}

struct DecodeStream {
    /// Path of the media file this stream decodes.
    _media_path: String,
    /// Output frame width in pixels.
    _width: u32,
    /// Output frame height in pixels.
    _height: u32,
    /// Index of the most recently decoded frame.
    current_frame: Arc<AtomicU32>,
    /// Frame cache for the recent frames pulled from this stream
    recent_frames: Arc<Mutex<LruCache<u32, Vec<u8>>>>,
    /// Channel to request a seek (which restarts the ffmpeg process)
    seek_tx: mpsc::Sender<u32>,
}

impl DecodeStream {
    // Spawn a decode stream that runs ffmpeg in a background thread, filling the LRU frame cache.
    fn new(media_path: String, width: u32, height: u32) -> Self {
        let width = width.max(1);
        let height = height.max(1);
        let current_frame = Arc::new(AtomicU32::new(0));
        let recent_frames = Arc::new(Mutex::new(LruCache::new(NonZeroUsize::new(120).unwrap())));
        let (seek_tx, mut seek_rx) = mpsc::channel::<u32>(10);

        let stream_path = sanitize_media_path(&media_path);
        let cur_frame_ref = current_frame.clone();
        let frames_ref = recent_frames.clone();

        tokio::task::spawn_blocking(move || {
            let mut ffmpeg_child: Option<std::process::Child> = None;
            // Use checked multiplication to prevent overflow
            let expected_size = (width as usize)
                .checked_mul(height as usize)
                .and_then(|s| s.checked_mul(4))
                .unwrap_or(0);
            if expected_size == 0 {
                eprintln!(
                    "[RingBufferDecoder] Invalid dimensions: {}x{} — stream disabled",
                    width, height
                );
                return;
            }

            let mut start_frame = 0;

            loop {
                // Check if a seek was requested
                if let Ok(seek_target) = seek_rx.try_recv() {
                    if let Some(mut child) = ffmpeg_child.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                    start_frame = seek_target;
                }

                if ffmpeg_child.is_none() {
                    let timestamp_sec = (start_frame as f64) / 24.0;
                    let timestamp_str = format!("{:.3}", timestamp_sec);

                    let child = Command::new("ffmpeg")
                        .args([
                            "-ss",
                            &timestamp_str,
                            "-i",
                            &stream_path,
                            "-f",
                            "rawvideo",
                            "-pix_fmt",
                            "rgba",
                            "-s",
                            &format!("{}x{}", width, height),
                            "-loglevel",
                            "error",
                            "-",
                        ])
                        .stdout(Stdio::piped())
                        .stderr(Stdio::null())
                        .spawn();

                    if let Ok(c) = child {
                        ffmpeg_child = Some(c);
                        cur_frame_ref.store(start_frame, Ordering::SeqCst);
                    } else {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        continue;
                    }
                }

                if let Some(ref mut child) = ffmpeg_child {
                    if let Some(ref mut stdout) = child.stdout {
                        let mut buffer = vec![0u8; expected_size];
                        if stdout.read_exact(&mut buffer).is_ok() {
                            let frame_idx = cur_frame_ref.load(Ordering::SeqCst);

                            // Insert into ring buffer / LRU
                            let mut cache = frames_ref.blocking_lock();
                            cache.put(frame_idx, buffer);
                            drop(cache);

                            cur_frame_ref.fetch_add(1, Ordering::SeqCst);
                        } else {
                            // EOF or error, wait for next seek
                            let _ = child.kill();
                            ffmpeg_child = None;
                            std::thread::sleep(std::time::Duration::from_millis(50));
                        }
                    }
                }
            }
        });

        Self {
            _media_path: media_path,
            _width: width,
            _height: height,
            current_frame,
            recent_frames,
            seek_tx,
        }
    }

    // Return the requested frame from cache, triggering a seek and polling if not yet decoded.
    async fn get_frame(&self, frame_idx: u32) -> Result<Vec<u8>, String> {
        // Check if it's in the cache
        {
            let mut cache = self.recent_frames.lock().await;
            if let Some(frame) = cache.get(&frame_idx) {
                return Ok(frame.clone());
            }
        }

        let current = self.current_frame.load(Ordering::SeqCst);

        // If the requested frame is too far behind or too far ahead, trigger a seek
        if frame_idx < current || frame_idx > current + 60 {
            let _ = self.seek_tx.send(frame_idx).await;
        }

        // Poll until the frame arrives in the cache
        for _ in 0..50 {
            {
                let mut cache = self.recent_frames.lock().await;
                if let Some(frame) = cache.get(&frame_idx) {
                    return Ok(frame.clone());
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }

        Err("Timeout waiting for frame from ring buffer".to_string())
    }
}

/// A highly optimized `AssetLoader` that maintains continuous FFmpeg decoding
/// streams with LRU frame caching. Each media file gets a dedicated
/// `DecodeStream` that runs in a background thread, pre-decoding frames into
/// a ring buffer for low-latency scrubbing.
pub struct RingBufferDecoder {
    /// Output frame width in pixels.
    width: u32,
    /// Output frame height in pixels.
    height: u32,
    /// Active decode streams keyed by media id.
    streams: Arc<Mutex<HashMap<String, Arc<DecodeStream>>>>,
}

impl RingBufferDecoder {
    /// Creates a new `RingBufferDecoder` that will produce frames at the given
    /// resolution.
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            streams: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl AssetLoader for RingBufferDecoder {
    // Returns a frame from the media's decode stream, creating one if needed.
    fn load_frame(
        &self,
        media_id: &str,
        frame_idx: u32,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<u8>, String>> + Send>> {
        let media_id = media_id.to_string();
        let decoder = self.streams.clone();
        let width = self.width;
        let height = self.height;

        Box::pin(async move {
            let mut streams = decoder.lock().await;
            let stream = if let Some(s) = streams.get(&media_id) {
                s.clone()
            } else {
                let s = Arc::new(DecodeStream::new(media_id.clone(), width, height));
                streams.insert(media_id.clone(), s.clone());
                s
            };
            drop(streams);

            stream.get_frame(frame_idx).await
        })
    }
}

/// A native FFmpeg decoder that reads a media file directly via the
/// `ffmpeg-next` crate. Supports seeking to arbitrary frames with on-the-fly
/// scaling to the requested output resolution.
#[cfg(feature = "native-ffmpeg")]
pub struct NativeFfmpegDecoder {
    /// Path of the media file to decode.
    media_path: String,
    /// Output frame width in pixels.
    width: u32,
    /// Output frame height in pixels.
    height: u32,
}

#[cfg(feature = "native-ffmpeg")]
impl NativeFfmpegDecoder {
    /// Initializes FFmpeg and creates a new decoder for the given media file
    /// at the specified output resolution.
    pub fn new(media_path: String, width: u32, height: u32) -> Self {
        ffmpeg_next::init().unwrap_or_else(|e| eprintln!("FFmpeg init failed: {}", e));
        Self {
            media_path,
            width,
            height,
        }
    }

    /// Decodes a single frame at the given index, seeking to the approximate
    /// position and scaling to the target resolution. Returns raw RGBA bytes.
    pub fn decode_frame(&self, frame_idx: u32) -> Option<Vec<u8>> {
        let mut ictx = ffmpeg_next::format::input(&self.media_path).ok()?;
        let input = ictx.streams().best(ffmpeg_next::media::Type::Video)?;
        let stream_index = input.index();
        let context_decoder =
            ffmpeg_next::codec::context::Context::from_parameters(input.parameters()).ok()?;
        let mut decoder = context_decoder.decoder().video().ok()?;

        let time_base = input.time_base();
        let fps = input.rate();

        // Approximate seek timestamp
        let seek_time = (frame_idx as f64) / f64::from(fps.0) * f64::from(fps.1);
        let timestamp = (seek_time * f64::from(time_base.1) / f64::from(time_base.0)) as i64;

        let _ = ictx.seek(timestamp, ..timestamp);

        let mut scaler = ffmpeg_next::software::scaling::Context::get(
            decoder.format(),
            decoder.width(),
            decoder.height(),
            ffmpeg_next::format::Pixel::RGBA,
            self.width,
            self.height,
            ffmpeg_next::software::scaling::flag::Flags::BILINEAR,
        )
        .ok()?;

        let mut receive_and_process_decoded_frames =
            |decoder: &mut ffmpeg_next::decoder::Video| -> Option<Vec<u8>> {
                let mut decoded = ffmpeg_next::frame::Video::empty();
                while decoder.receive_frame(&mut decoded).is_ok() {
                    let mut rgb_frame = ffmpeg_next::frame::Video::empty();
                    let _ = scaler.run(&decoded, &mut rgb_frame);

                    let data = rgb_frame.data(0);
                    let len = (self.width * self.height * 4) as usize;
                    if data.len() >= len {
                        return Some(data[..len].to_vec());
                    }
                }
                None
            };

        for (stream, packet) in ictx.packets() {
            if stream.index() == stream_index {
                let _ = decoder.send_packet(&packet);
                if let Some(frame) = receive_and_process_decoded_frames(&mut decoder) {
                    return Some(frame);
                }
            }
        }

        let _ = decoder.send_eof();
        receive_and_process_decoded_frames(&mut decoder)
    }
}
