//! Audio playback engine for the NLE timeline.
//!
//! Wraps the `rodio` cross-platform audio library to provide a simple
//! playback interface that supports file-based audio, raw sample buffers,
//! and transport controls (play, pause, resume, stop, volume).

use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

/// High-level audio playback engine backed by rodio.
///
/// Owns the platform output stream, a stream handle, and a sink that
/// mixes multiple audio sources. Supports file playback, raw sample
/// injection, and standard transport controls.
pub struct AudioPlayback {
    _stream: OutputStream,
    _stream_handle: OutputStreamHandle,
    sink: Sink,
}

impl AudioPlayback {
    /// Create a new audio playback engine, acquiring the default output stream.
    pub fn new() -> Result<Self, String> {
        let (_stream, _stream_handle) = OutputStream::try_default()
            .map_err(|e| format!("Failed to get default audio output stream: {}", e))?;
        let sink = Sink::try_new(&_stream_handle)
            .map_err(|e| format!("Failed to create audio sink: {}", e))?;

        Ok(Self {
            _stream,
            _stream_handle,
            sink,
        })
    }

    /// Play an audio file from disk (WAV, MP3, FLAC, etc.) by appending it to the sink.
    pub fn play_file<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open audio file: {}", e))?;
        let reader = BufReader::new(file);
        let decoder = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

        self.sink.append(decoder);
        Ok(())
    }

    /// Play a raw PCM sample buffer with the given sample rate and channel count.
    pub fn play_raw(&self, samples: Vec<f32>, sample_rate: u32, channels: u16) {
        let buffer = rodio::buffer::SamplesBuffer::new(channels, sample_rate, samples);
        self.sink.append(buffer);
    }

    /// Set the playback volume (0.0 = silent, 1.0 = unity gain).
    pub fn set_volume(&self, volume: f32) {
        self.sink.set_volume(volume);
    }

    /// Pause playback.
    pub fn pause(&self) {
        self.sink.pause();
    }

    /// Resume playback after pausing.
    pub fn resume(&self) {
        self.sink.play();
    }

    /// Stop playback and clear the sink.
    pub fn stop(&self) {
        self.sink.stop();
    }
}
