//! Hardware audio mixer via rodio/cpal.
//!
//! The mixer wraps a rodio output stream and sink to provide
//! platform-native audio playback (CoreAudio on macOS, WASAPI on
//! Windows, ALSA/PulseAudio on Linux). Supports file playback
//! (any format rodio can decode) and raw sample buffer injection
//! for real-time synthesized audio.

use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

/// Hardware-accelerated audio mixer backed by rodio/cpal.
///
/// Manages a platform-native audio output stream and sink for file decoding
/// playback and raw sample buffer injection. Supports basic transport controls
/// (play, pause, resume, stop) and per-sink volume control.
pub struct Mixer {
    _stream: OutputStream,
    _stream_handle: OutputStreamHandle,
    sink: Sink,
}

impl Mixer {
    /// Creates a new mixer backed by the system's default audio output.
    ///
    /// Returns an error if the audio device cannot be opened (e.g. no
    /// sound hardware or all devices busy).
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

    /// Plays an audio file (any format rodio can decode) through the mixer.
    ///
    /// The file is decoded and appended to the sink's playback queue.
    /// Returns an error if the file cannot be opened or decoded.
    pub fn play_file<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open audio file: {}", e))?;
        let reader = BufReader::new(file);
        let decoder = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

        self.sink.append(decoder);
        Ok(())
    }

    /// Plays raw PCM samples through the mixer.
    ///
    /// Samples should be interleaved if `channels > 1`. Appends the buffer
    /// to the sink's playback queue for immediate playback.
    pub fn play_raw(&self, samples: Vec<f32>, sample_rate: u32, channels: u16) {
        let buffer = rodio::buffer::SamplesBuffer::new(channels, sample_rate, samples);
        self.sink.append(buffer);
    }

    /// Sets the sink playback volume.
    ///
    /// Values are linear: 1.0 is unity gain, 0.0 is silence, 2.0 is +6 dB.
    pub fn set_volume(&self, volume: f32) {
        self.sink.set_volume(volume);
    }

    /// Pauses playback without discarding the queue.
    ///
    /// Call [`resume`](Self::resume) to continue playback from the same position.
    pub fn pause(&self) {
        self.sink.pause();
    }

    /// Resumes playback after a [`pause`](Self::pause).
    pub fn resume(&self) {
        self.sink.play();
    }

    /// Stops playback and drains the sink queue.
    ///
    /// All pending audio is discarded; new content can be appended after this call.
    pub fn stop(&self) {
        self.sink.stop();
    }
}
