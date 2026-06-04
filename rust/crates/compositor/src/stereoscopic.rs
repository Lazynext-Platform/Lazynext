pub struct StereoscopicCamera {
    pub left_eye_clip_id: String,
    pub right_eye_clip_id: String,
    /// Distance between the two cameras, controls the 3D depth effect
    pub interocular_distance: f32, 
    /// Convergence point where the two camera views intersect
    pub convergence_plane: f32,
}

impl StereoscopicCamera {
    pub fn new(left_id: &str, right_id: &str) -> Self {
        Self {
            left_eye_clip_id: left_id.to_string(),
            right_eye_clip_id: right_id.to_string(),
            interocular_distance: 6.5, // average human eye distance in cm
            convergence_plane: 100.0,
        }
    }

    /// Simulates the mathematical compositing required to generate a 3D Anaglyph.
    /// In a real WGSL shader, it extracts the Red channel from the Left Eye,
    /// and the Green/Blue (Cyan) channels from the Right Eye, blending them together.
    pub fn render_anaglyph_preview(&self) {
        println!("Rendering Stereoscopic 3D Preview...");
        println!("Left Eye: [{}] -> Extracting RED channel", self.left_eye_clip_id);
        println!("Right Eye: [{}] -> Extracting CYAN (Green+Blue) channels", self.right_eye_clip_id);
        println!("Applying Divergence: {} (Interocular) at Plane: {}", self.interocular_distance, self.convergence_plane);
    }
}
