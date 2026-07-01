//! Timeline management and preview rendering.
//!
//! Orchestrates the composition of tracks and media items into a renderable
//! timeline, driving the real-time preview pipeline.

use crate::models::Project;

/// Manages timeline composition and drives the real-time preview pipeline.
pub struct TimelineManager {
    project: Project,
}

impl TimelineManager {
    /// Create a new timeline manager for the given project.
    pub fn new(project: Project) -> Self {
        Self { project }
    }

    /// Render a real-time preview frame for the current timeline state.
    pub fn render_preview(&self) {
        println!("Rendering preview for project: {}", self.project.name);
    }
}
