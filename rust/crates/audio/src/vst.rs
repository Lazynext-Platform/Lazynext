use anyhow::Result;

#[allow(clippy::large_enum_variant)]
pub struct VstHost {
    plugin_path: String,
    is_loaded: bool,
}

impl Default for VstHost {
    fn default() -> Self {
        Self::new()
    }
}

impl VstHost {
    pub fn new() -> Self {
        Self {
            plugin_path: String::new(),
            is_loaded: false,
        }
    }

    pub fn load_plugin(&mut self, path: &str) -> Result<()> {
        // MOCK: VST3 dynamic library loading (dll/so/dylib)
        println!("Loading VST3 plugin from: {}", path);
        self.plugin_path = path.to_string();
        self.is_loaded = true;
        Ok(())
    }

    pub fn process_audio(&self, mut input: Vec<f32>) -> Vec<f32> {
        if !self.is_loaded {
            return input;
        }
        // MOCK: Apply plugin DSP function across the audio buffer
        println!("Applying VST3 DSP to audio buffer...");
        for sample in input.iter_mut() {
            *sample *= 0.8; // e.g. a simple mock compressor effect
        }
        input
    }
}
