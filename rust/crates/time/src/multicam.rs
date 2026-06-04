pub struct MulticamClip {
    pub id: String,
    pub camera_angles: Vec<String>, // IDs of underlying media clips
    pub active_angle: usize,
}

impl MulticamClip {
    pub fn new(id: &str, angles: Vec<String>) -> Self {
        Self {
            id: id.to_string(),
            camera_angles: angles,
            active_angle: 0, // Default to Cam 1
        }
    }

    /// Executed by the frontend when the user presses '1', '2', '3' during playback
    pub fn trigger_live_cut(&mut self, angle_index: usize, frame_timestamp: u64) {
        if angle_index < self.camera_angles.len() {
            println!("Multicam Cut triggered to angle {} at frame {}!", angle_index + 1, frame_timestamp);
            self.active_angle = angle_index;
            // In a real implementation, this would insert a hard cut (split clip)
            // at `frame_timestamp` on the active video track!
        }
    }
}
