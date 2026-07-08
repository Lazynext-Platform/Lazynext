//! Spatial audio pipeline: 3D object positioning and binaural rendering.
//!
//! Models audio sources as objects in a hemispherical room coordinate system
//! and simulates panning across multi-channel speaker layouts (up to 7.1.4
//! Dolby Atmos). The HRTF processor converts monaural sources into binaural
//! stereo output using interaural time/level differences for headphone
//! listening.

/// An audio source positioned in 3D space.
pub struct AudioObject {
    /// Unique identifier for this audio object.
    pub id: String,
    // 3D coordinates representing where the sound exists in a physical room hemisphere
    /// Horizontal position: -1.0 (left) to 1.0 (right).
    pub x: f32, // -1.0 (Left) to 1.0 (Right)
    /// Front-to-back position: -1.0 (rear) to 1.0 (front).
    pub y: f32, // -1.0 (Rear) to 1.0 (Front)
    /// Vertical position: 0.0 (floor) to 1.0 (ceiling).
    pub z: f32, // 0.0 (Floor) to 1.0 (Ceiling)

    /// Volume level in decibels (0.0 = unity gain).
    pub volume_db: f32,
}

impl AudioObject {
    /// Create a new audio object at the default front-center position.
    pub fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            x: 0.0,
            y: 1.0, // Default front-center
            z: 0.0,
            volume_db: 0.0,
        }
    }

    /// Simulates panning an audio object across a 7.1.4 Dolby Atmos surround sound bed.
    /// In a real engine, this would distribute audio signal amplitude across 12 discrete channels
    /// based on the Euclidean distance from the listener at (0,0,0).
    pub fn pan_spatial(&self) {
        println!(
            "Panning Audio Object [{}] to Spatial Coordinates: (X: {}, Y: {}, Z: {})",
            self.id, self.x, self.y, self.z
        );

        if self.z > 0.5 {
            println!("-> Routing signal to overhead ceiling speakers (Atmos 0.0.4)");
        }
        if self.y < -0.5 {
            println!("-> Routing signal to rear surround speakers (7.1.0)");
        }
    }
}

/// Head-Related Transfer Function (HRTF) Processor
/// Converts 3D monaural sound sources into a Binaural (2-channel stereo) output
/// that tricks the human brain into perceiving accurate 3D spatial positioning using standard headphones.
pub struct HRTFProcessor {
    /// Audio sample rate in Hz.
    pub sample_rate: u32,
    /// Typical human head radius in meters (~0.0875).
    pub head_radius_meters: f32, // Typical human head ~ 0.0875m
    /// Speed of sound in meters per second (~343.0).
    pub speed_of_sound: f32, // ~ 343.0 m/s
}

impl HRTFProcessor {
    /// Create a new HRTF processor with default human head parameters.
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sample_rate,
            head_radius_meters: 0.0875,
            speed_of_sound: 343.0,
        }
    }

    /// Apply Interaural Time Difference (ITD) and Interaural Level Difference (ILD)
    /// Returns a tuple of (Left Channel Output, Right Channel Output)
    pub fn process_binaural(
        &self,
        audio_object: &AudioObject,
        input_buffer: &[f32],
    ) -> (Vec<f32>, Vec<f32>) {
        // Calculate the azimuth angle based on X and Y coordinates (-1.0 to 1.0)
        let azimuth_rad = audio_object.x.atan2(audio_object.y);

        // Woodworth's formula for ITD (Interaural Time Difference)
        let itd_seconds =
            (self.head_radius_meters / self.speed_of_sound) * (azimuth_rad + azimuth_rad.sin());
        let itd_samples = (itd_seconds * self.sample_rate as f32).abs() as usize;

        // Simple ILD (Interaural Level Difference) based on shadowing
        let shadow_factor = 0.5 * (1.0 - azimuth_rad.cos());
        let mut left_gain = 1.0;
        let mut right_gain = 1.0;

        if audio_object.x > 0.0 {
            // Source is to the right
            left_gain -= shadow_factor;
        } else {
            // Source is to the left
            right_gain -= shadow_factor;
        }

        // Apply delay (ITD) and attenuation (ILD)
        let mut left_output = vec![0.0; input_buffer.len() + itd_samples];
        let mut right_output = vec![0.0; input_buffer.len() + itd_samples];

        for (i, &sample) in input_buffer.iter().enumerate() {
            if audio_object.x > 0.0 {
                // Delay left ear
                left_output[i + itd_samples] = sample * left_gain;
                right_output[i] = sample * right_gain;
            } else {
                // Delay right ear
                left_output[i] = sample * left_gain;
                right_output[i + itd_samples] = sample * right_gain;
            }
        }

        (left_output, right_output)
    }
}
