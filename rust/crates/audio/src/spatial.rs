pub struct AudioObject {
    pub id: String,
    // 3D coordinates representing where the sound exists in a physical room hemisphere
    pub x: f32, // -1.0 (Left) to 1.0 (Right)
    pub y: f32, // -1.0 (Rear) to 1.0 (Front)
    pub z: f32, // 0.0 (Floor) to 1.0 (Ceiling)

    pub volume_db: f32,
}

impl AudioObject {
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
