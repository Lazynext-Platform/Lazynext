//! FCPXML type definitions matching DaVinci Resolve schema.

use serde::{Deserialize, Serialize};

/// Media linking mode for FCPXML export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MediaLinkMode {
    /// Use relative paths from media folder (recommended)
    Relative,
    /// Use absolute file paths
    Absolute,
    /// Use file:// URIs
    FileUri,
}

/// Configuration for FCPXML export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FcpxmlConfig {
    /// Project name in FCPXML
    pub project_name: String,
    /// Timeline resolution width (e.g., 1920)
    pub width: u32,
    /// Timeline resolution height (e.g., 1080)
    pub height: u32,
    /// Frame rate as fraction (numerator)
    pub frame_rate_num: u32,
    /// Frame rate as fraction (denominator)
    pub frame_rate_den: u32,
    /// Media linking mode
    pub media_link_mode: MediaLinkMode,
    /// Base path for media files
    pub media_base_path: String,
    /// Include audio tracks
    pub include_audio: bool,
    /// Include basic transform data (position, scale, rotation)
    pub include_transforms: bool,
}

impl Default for FcpxmlConfig {
    fn default() -> Self {
        Self {
            project_name: "Lazynext Export".to_string(),
            width: 1920,
            height: 1080,
            frame_rate_num: 30,
            frame_rate_den: 1,
            media_link_mode: MediaLinkMode::Relative,
            media_base_path: "./media".to_string(),
            include_audio: true,
            include_transforms: true,
        }
    }
}

/// Represents a video clip in FCPXML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoClip {
    pub id: String,
    pub name: String,
    pub source_path: String,
    pub start_time: f64,
    pub duration: f64,
    pub track_index: usize,
    pub offset_in_track: f64,
}

/// Represents an audio clip in FCPXML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioClip {
    pub id: String,
    pub name: String,
    pub source_path: String,
    pub start_time: f64,
    pub duration: f64,
    pub track_index: usize,
    pub offset_in_track: f64,
}

/// Complete FCPXML document structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FcpxmlDocument {
    pub version: String,
    pub project_name: String,
    pub format: FormatInfo,
    pub resources: Vec<Resource>,
    pub timeline: Timeline,
}

/// Format information (resolution, frame rate)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatInfo {
    pub width: u32,
    pub height: u32,
    pub frame_rate_num: u32,
    pub frame_rate_den: u32,
}

/// Resource (media file reference)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub id: String,
    pub name: String,
    pub path: String,
    pub resource_type: ResourceType,
}

/// Type of media resource
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceType {
    Video,
    Audio,
}

/// Timeline containing all tracks and clips
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timeline {
    pub tracks: Vec<Track>,
}

/// A track containing clips
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub track_type: TrackType,
    pub clips: Vec<Clip>,
}

/// Type of track
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TrackType {
    Video,
    Audio,
}

/// A clip in the timeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub name: String,
    pub resource_id: String,
    pub start: f64,
    pub duration: f64,
    pub offset: f64,
}
