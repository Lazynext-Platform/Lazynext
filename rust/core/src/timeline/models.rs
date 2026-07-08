//! Timeline data models — elements, tracks, and scene track containers.

use serde::{Deserialize, Serialize};

/// A single element on the timeline — a video, audio, text, or effect item
/// with a start time, duration, and optional track association.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineElement {
    /// Unique element identifier.
    pub id: String,
    /// Element type (e.g. "video", "audio").
    pub r#type: String, // "video", "audio", etc.
    /// Start time on the timeline in seconds.
    pub start_time: f64,
    /// Duration in seconds.
    pub duration: f64,
    /// Identifier of the track this element belongs to, if any.
    pub track_id: Option<String>,
    // other fields omitted for placement logic
}

/// A timeline track containing a sequence of elements of a common type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineTrack {
    /// Unique track identifier.
    pub id: String,
    /// Track type (e.g. "video", "audio").
    pub r#type: String,
    /// Elements contained in this track.
    pub elements: Vec<TimelineElement>,
}

/// The full scene track layout: overlay tracks on top, one main track in the
/// middle, and audio tracks on the bottom.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneTracks {
    /// Overlay tracks rendered above the main track.
    pub overlay: Vec<TimelineTrack>,
    /// The primary main track.
    pub main: TimelineTrack,
    /// Audio tracks rendered below the main track.
    pub audio: Vec<TimelineTrack>,
}
