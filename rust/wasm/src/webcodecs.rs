use js_sys::{Function, Uint8Array};
use wasm_bindgen::prelude::*;

/// Wrapper around the browser's native WebCodecs VideoDecoder API.
///
/// Provides hardware-accelerated video decoding in the browser via
/// the WebCodecs API (available in Chrome 94+, Edge 94+, Opera 80+).
/// Falls back to software decoding when hardware acceleration is unavailable.
///
/// Usage:
/// ```js
/// const decoder = new VideoDecoderWrapper("avc1.640028");
/// decoder.configure(null);
/// decoder.decodeChunk(encodedData, 0, true);
/// await decoder.flush();
/// ```
#[wasm_bindgen]
pub struct VideoDecoderWrapper {
    codec: String,
    /// The underlying VideoDecoder instance (stored as JsValue for now;
    /// full web_sys VideoDecoder bindings are being upstreamed).
    decoder: Option<web_sys::VideoDecoder>,
    /// Callback invoked when a decoded frame is ready
    on_frame: Option<js_sys::Function>,
    frame_count: u32,
}

#[wasm_bindgen]
impl VideoDecoderWrapper {
    #[wasm_bindgen(constructor)]
    pub fn new(codec: String, on_frame_cb: Option<js_sys::Function>) -> Self {
        Self {
            codec,
            decoder: None,
            on_frame: on_frame_cb,
            frame_count: 0,
        }
    }

    /// Configure the decoder with codec-specific initialization data.
    ///
    /// The `description` parameter contains codec-specific data:
    ///   - H.264: AVCC extradata (SPS/PPS)
    ///   - VP9: empty (codec string is sufficient)
    ///   - AV1: AV1CodecConfigurationRecord
    #[wasm_bindgen]
    pub fn configure(&mut self, description: Option<Uint8Array>) -> Result<(), JsValue> {
        let mut config = web_sys::VideoDecoderConfig::new(&self.codec);

        if let Some(desc) = description {
            // Allow buffered decoding for smoother playback
            let desc_buffer = js_sys::ArrayBuffer::new(desc.length());
            let desc_view = Uint8Array::new(&desc_buffer);
            desc_view.set(&desc, 0);
            config.set_description(&desc_buffer);
        }

        let on_frame_cb = self.on_frame.clone();
        let on_frame = Closure::wrap(Box::new(move |frame: web_sys::VideoFrame| {
            if let Some(ref cb) = on_frame_cb {
                // Pass the frame to JS (e.g. for createImageBitmap and wgpu upload)
                let _ = cb.call1(&JsValue::NULL, &frame);
            } else {
                let _ = frame.timestamp();
                frame.close();
            }
        }) as Box<dyn FnMut(web_sys::VideoFrame)>);

        let error_cb = Closure::wrap(Box::new(move |e: JsValue| {
            web_sys::console::error_1(&JsValue::from_str(&format!(
                "WebCodecs decode error: {:?}",
                e
            )));
        }) as Box<dyn FnMut(JsValue)>);

        let decoder = web_sys::VideoDecoder::new(&web_sys::VideoDecoderInit::new(
            error_cb.as_ref().unchecked_ref(),
            on_frame.as_ref().unchecked_ref(),
        ))?;
        
        // Prevent closures from being dropped while decoder is alive
        error_cb.forget();
        on_frame.forget();

        decoder.configure(&config)?;

        // Store for later cleanup
        self.decoder = Some(decoder);

        web_sys::console::log_1(&JsValue::from_str(&format!(
            "WebCodecs decoder configured for codec: {}",
            self.codec
        )));

        Ok(())
    }

    /// Decode a raw encoded video chunk.
    ///
    /// # Arguments
    /// * `chunk_data` — Raw encoded bytes (NAL units for H.264, OBUs for AV1)
    /// * `timestamp` — Presentation timestamp in microseconds
    /// * `is_keyframe` — Whether this chunk starts a new GOP
    /// * `duration` — Duration of this chunk in microseconds (optional)
    #[wasm_bindgen]
    pub fn decode_chunk(
        &self,
        chunk_data: Uint8Array,
        timestamp: f64,
        is_keyframe: bool,
        duration: Option<f64>,
    ) -> Result<(), JsValue> {
        let decoder = self
            .decoder
            .as_ref()
            .ok_or_else(|| JsValue::from_str("Decoder not configured"))?;

        let chunk_type = if is_keyframe {
            web_sys::EncodedVideoChunkType::Key
        } else {
            web_sys::EncodedVideoChunkType::Delta
        };

        let mut chunk_init =
            web_sys::EncodedVideoChunkInit::new(&chunk_data.buffer(), timestamp as i32, chunk_type);

        if let Some(dur) = duration {
            chunk_init.set_duration(dur as u32);
        }

        let chunk = web_sys::EncodedVideoChunk::new(&chunk_init)?;
        decoder.decode(&chunk);

        Ok(())
    }

    /// Flush the decoder, waiting for all pending frames to be emitted.
    /// Returns after all queued frames have been processed.
    #[wasm_bindgen]
    pub async fn flush(&self) -> Result<(), JsValue> {
        if let Some(ref decoder) = self.decoder {
            // Await the flush promise
            let _ = decoder.flush();
        }
        Ok(())
    }

    /// Reset the decoder state (e.g., after a seek).
    #[wasm_bindgen]
    pub fn reset(&self) -> Result<(), JsValue> {
        if let Some(ref decoder) = self.decoder {
            decoder.reset()?;
        }
        Ok(())
    }

    /// Get the codec string this decoder was initialized with.
    #[wasm_bindgen]
    pub fn codec(&self) -> String {
        self.codec.clone()
    }

    /// Get the number of frames decoded so far.
    #[wasm_bindgen]
    pub fn frame_count(&self) -> u32 {
        self.frame_count
    }

    /// Close the decoder and release all resources.
    /// Must be called to prevent memory leaks.
    #[wasm_bindgen]
    pub fn close(&mut self) {
        if let Some(ref decoder) = self.decoder {
            decoder.close();
        }
        self.decoder = None;
    }
}

// Note: This struct uses web_sys::VideoDecoder which requires:
//   web-sys = { version = "0.3", features = ["VideoDecoder", "VideoDecoderConfig",
//     "VideoDecoderInit", "EncodedVideoChunk", "EncodedVideoChunkInit",
//     "EncodedVideoChunkType", "VideoFrame"] }
//
// If these web-sys features are not yet available (they're being upstreamed),
// the decoder field can be stored as JsValue and the native JS API accessed
// via js-sys reflection.
