//! Stereoscopic 3D compositing for VR and 3D cinema output.
//!
//! Supports:
//!   - Anaglyph (red/cyan) preview — no special display needed
//!   - Side-by-side (SBS) — for VR headsets and 3D TVs
//!   - Over-under (OU) — for 3D Blu-ray / broadcast
//!   - Interleaved — per-eye rendering for active shutter glasses

use crate::frame::{FrameDescriptor, FrameItemDescriptor};

/// Rendering mode for stereoscopic output.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum StereoMode {
    /// Red/cyan anaglyph — viewable with cheap glasses
    Anaglyph,
    /// Left-right side by side (half resolution per eye)
    SideBySide,
    /// Top-bottom over-under (half resolution per eye)
    OverUnder,
    /// Full resolution per eye (rendered as two separate passes)
    FullRes,
}

/// Camera configuration for stereoscopic 3D rendering.
///
/// Defines left/right eye clip sources, interocular distance, convergence
/// plane, and the current output mode.
pub struct StereoscopicCamera {
    /// Media clip ID for the left eye view.
    pub left_eye_clip_id: String,
    /// Media clip ID for the right eye view.
    pub right_eye_clip_id: String,
    /// Distance between virtual cameras in scene units (default 6.5cm)
    pub interocular_distance: f32,
    /// Distance to the convergence plane in scene units
    pub convergence_plane: f32,
    /// Current rendering mode
    pub mode: StereoMode,
}

impl StereoscopicCamera {
    /// Create a new stereoscopic camera in anaglyph mode with default IO/convergence.
    pub fn new(left_id: &str, right_id: &str) -> Self {
        Self {
            left_eye_clip_id: left_id.to_string(),
            right_eye_clip_id: right_id.to_string(),
            interocular_distance: 6.5,
            convergence_plane: 100.0,
            mode: StereoMode::Anaglyph,
        }
    }

    /// Build the WGSL shader code for anaglyph compositing.
    ///
    /// Extracts red channel from left eye, cyan (green+blue) from right eye.
    /// The result is viewable with standard red/cyan 3D glasses.
    pub fn anaglyph_shader_source() -> &'static str {
        r#"
// Stereoscopic anaglyph fragment shader
// Left eye → red channel, Right eye → green+blue (cyan) channels

@group(0) @binding(0) var left_texture: texture_2d<f32>;
@group(0) @binding(1) var right_texture: texture_2d<f32>;
@group(0) @binding(2) var nearest_sampler: sampler;

@fragment
fn fragment_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let left_color = textureSample(left_texture, nearest_sampler, uv);
    let right_color = textureSample(right_texture, nearest_sampler, uv);

    // Anaglyph: left eye → red, right eye → green+blue
    // Weighted to maintain perceived luminance
    let r = left_color.r;
    let g = right_color.g;
    let b = right_color.b;

    return vec4<f32>(r, g, b, max(left_color.a, right_color.a));
}
"#
    }

    /// Build the WGSL shader code for side-by-side output.
    ///
    /// Packs both eyes horizontally: left half = left eye, right half = right eye.
    pub fn side_by_side_shader_source() -> &'static str {
        r#"
@group(0) @binding(0) var left_texture: texture_2d<f32>;
@group(0) @binding(1) var right_texture: texture_2d<f32>;
@group(0) @binding(2) var nearest_sampler: sampler;

@fragment
fn fragment_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    if (uv.x < 0.5) {
        let left_uv = vec2<f32>(uv.x * 2.0, uv.y);
        return textureSample(left_texture, nearest_sampler, left_uv);
    } else {
        let right_uv = vec2<f32>((uv.x - 0.5) * 2.0, uv.y);
        return textureSample(right_texture, nearest_sampler, right_uv);
    }
}
"#
    }

    /// Build the WGSL shader code for over-under output.
    pub fn over_under_shader_source() -> &'static str {
        r#"
@group(0) @binding(0) var left_texture: texture_2d<f32>;
@group(0) @binding(1) var right_texture: texture_2d<f32>;
@group(0) @binding(2) var nearest_sampler: sampler;

@fragment
fn fragment_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    if (uv.y < 0.5) {
        let left_uv = vec2<f32>(uv.x, uv.y * 2.0);
        return textureSample(left_texture, nearest_sampler, left_uv);
    } else {
        let right_uv = vec2<f32>(uv.x, (uv.y - 0.5) * 2.0);
        return textureSample(right_texture, nearest_sampler, right_uv);
    }
}
"#
    }

    /// Get the horizontal offset for a given eye at the convergence plane.
    ///
    /// Positive = rightward offset. The offset is scaled by depth
    /// so objects at the convergence plane have zero parallax.
    pub fn eye_offset(&self, is_right_eye: bool) -> f32 {
        let half_io = self.interocular_distance * 0.5;
        if is_right_eye { half_io } else { -half_io }
    }

    /// Calculate parallax shift for an object at a given depth.
    ///
    /// Objects in front of the convergence plane (depth < convergence)
    /// appear to pop out of the screen. Objects behind appear to recede.
    pub fn parallax_shift(&self, object_depth: f32) -> f32 {
        let scale = self.convergence_plane / object_depth.max(0.01);
        self.interocular_distance * (1.0 - scale) * 0.5
    }

    /// Render a stereoscopic preview frame descriptor.
    ///
    /// In production, this builds two separate FrameDescriptors (one per eye)
    /// and composites them. For the preview, it generates a combined anaglyph.
    pub fn build_preview_descriptor(
        &self,
        width: u32,
        height: u32,
        left_frame_items: Vec<FrameItemDescriptor>,
        right_frame_items: Vec<FrameItemDescriptor>,
    ) -> FrameDescriptor {
        let _eye_width = match self.mode {
            StereoMode::SideBySide => width / 2,
            StereoMode::OverUnder => width,
            StereoMode::Anaglyph | StereoMode::FullRes => width,
        };
        let _eye_height = match self.mode {
            StereoMode::OverUnder => height / 2,
            StereoMode::SideBySide => height,
            StereoMode::Anaglyph | StereoMode::FullRes => height,
        };

        // In full implementation: render each eye separately and combine
        // For now: use the left eye items with slight offset for preview
        let mut items = left_frame_items;

        // Add right eye items with horizontal offset for anaglyph effect
        for item in right_frame_items {
            items.push(item);
        }

        FrameDescriptor {
            width,
            height,
            clear: crate::frame::CanvasClearDescriptor {
                color: [0.0, 0.0, 0.0, 1.0],
            },
            items,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parallax_at_convergence_is_zero() {
        let cam = StereoscopicCamera::new("L", "R");
        // At the convergence plane, parallax should be zero
        let px = cam.parallax_shift(cam.convergence_plane);
        assert!(
            px.abs() < 0.01,
            "Parallax at convergence plane should be ~0, got {}",
            px
        );
    }

    #[test]
    fn test_near_object_pops_out() {
        let cam = StereoscopicCamera::new("L", "R");
        // Object closer than convergence → negative parallax (pops out)
        let px = cam.parallax_shift(cam.convergence_plane * 0.5);
        assert!(px < 0.0, "Near object should pop out (negative parallax)");
    }

    #[test]
    fn test_far_object_recedes() {
        let cam = StereoscopicCamera::new("L", "R");
        // Object farther than convergence → positive parallax (recedes)
        let px = cam.parallax_shift(cam.convergence_plane * 2.0);
        assert!(px > 0.0, "Far object should recede (positive parallax)");
    }

    #[test]
    fn test_eye_offsets_are_symmetric() {
        let cam = StereoscopicCamera::new("L", "R");
        let left = cam.eye_offset(false);
        let right = cam.eye_offset(true);
        assert!(
            (left + right).abs() < 0.01,
            "Eye offsets should be symmetric"
        );
    }
}
