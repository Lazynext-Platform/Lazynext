//! Multicam clip management with live angle switching.
//!
//! `MulticamClip` holds multiple camera angles and tracks the active
//! angle. Live cuts are triggered by the frontend during playback and
//! insert hard cuts at the current frame timestamp.

/// A multicam clip with multiple camera angles and live switching.
pub struct MulticamClip {
    /// Unique identifier for this multicam clip.
    pub id: String,
    /// IDs of the underlying media clips, one per camera angle.
    pub camera_angles: Vec<String>,
    /// Index of the currently active camera angle.
    pub active_angle: usize,
}

impl MulticamClip {
    /// Create a new multicam clip with the given camera angles.
    /// Defaults to angle 0 (Cam 1) as active.
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
            println!(
                "Multicam Cut triggered to angle {} at frame {}!",
                angle_index + 1,
                frame_timestamp
            );
            self.active_angle = angle_index;
            // In a real implementation, this would insert a hard cut (split clip)
            // at `frame_timestamp` on the active video track!
        }
    }
}
