use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FrameBuffer {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

pub trait VideoEffect {
    /// The unique identifier for this effect plugin
    fn plugin_id(&self) -> &'static str;
    
    /// The display name shown in the Lazynext UI
    fn name(&self) -> &'static str;
    
    /// Initialize any internal state before rendering begins
    fn init(&mut self) {}

    /// Process a single frame buffer. 
    /// This is where the third-party developer writes their logic.
    fn process_frame(&self, frame: &mut FrameBuffer, time: f64);
}

// In a real WASI implementation, we would define C ABI externs here
// to allow dynamically loading `.wasm` plugins at runtime.
