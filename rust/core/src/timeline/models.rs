//! Timeline data models — elements, tracks, and scene track containers.

use serde::{Deserialize, Serialize};

/// A single element on the timeline — a video, audio, text, or effect item
/// with a start time, duration, and optional track association.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineElement {
    pub id: String,
    pub r#type: String, // "video", "audio", etc.
    pub start_time: f64,
    pub duration: f64,
    pub track_id: Option<String>,
    // other fields omitted for placement logic
}

/// A timeline track containing a sequence of elements of a common type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineTrack {
    pub id: String,
    pub r#type: String,
    pub elements: Vec<TimelineElement>,
}

/// The full scene track layout: overlay tracks on top, one main track in the
/// middle, and audio tracks on the bottom.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneTracks {
    pub overlay: Vec<TimelineTrack>,
    pub main: TimelineTrack,
    pub audio: Vec<TimelineTrack>,
}
