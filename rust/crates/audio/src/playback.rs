use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

pub struct AudioPlayback {
    _stream: OutputStream,
    _stream_handle: OutputStreamHandle,
    sink: Sink,
}

impl AudioPlayback {
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

    pub fn play_file<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open audio file: {}", e))?;
        let reader = BufReader::new(file);
        let decoder = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

        self.sink.append(decoder);
        Ok(())
    }

    pub fn play_raw(&self, samples: Vec<f32>, sample_rate: u32, channels: u16) {
        let buffer = rodio::buffer::SamplesBuffer::new(channels, sample_rate, samples);
        self.sink.append(buffer);
    }

    pub fn set_volume(&self, volume: f32) {
        self.sink.set_volume(volume);
    }

    pub fn pause(&self) {
        self.sink.pause();
    }

    pub fn resume(&self) {
        self.sink.play();
    }

    pub fn stop(&self) {
        self.sink.stop();
    }
}
