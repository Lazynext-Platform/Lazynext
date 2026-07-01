//! Core types for the placement subsystem: `PlacementTimeSpan`,
//! `PlacementSubject`, `PlacementStrategy`, and `PlacementResult`.

/// A time span for placement, with the start time, duration, and an optional
/// exclusion of a specific element (used when moving/resizing an existing element).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlacementTimeSpan {
    pub start_time: f64,
    pub duration: f64,
    pub exclude_element_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
/// What is being placed — either a typed element or a track type string.
pub enum PlacementSubject {
    ElementType(String),
    TrackType(String),
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
/// The strategy for resolving where a placement should land on the timeline.
pub enum PlacementStrategy {
    Explicit {
        #[serde(rename = "trackId")]
        track_id: String,
    },
    FirstAvailable,
    PreferIndex {
        #[serde(rename = "trackIndex")]
        track_index: usize,
        #[serde(rename = "hoverDirection")]
        hover_direction: String, // "above" | "below"
        #[serde(rename = "verticalDragDirection")]
        vertical_drag_direction: Option<String>, // "up" | "down"
        #[serde(rename = "createNewTrackOnly", default)]
        create_new_track_only: bool,
    },
    AboveSource {
        #[serde(rename = "sourceTrackIndex")]
        source_track_index: usize,
    },
    AlwaysNew {
        position: String,
    }, // "highest" | "default"
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
/// The resolved result of a placement operation — either an existing track
/// that can accept the element(s) or a new track to be created.
pub enum PlacementResult {
    ExistingTrack {
        #[serde(rename = "trackId")]
        track_id: String,
        #[serde(rename = "trackIndex")]
        track_index: usize,
        #[serde(rename = "trackType")]
        track_type: String,
        #[serde(rename = "adjustedStartTime")]
        adjusted_start_time: Option<f64>,
    },
    NewTrack {
        #[serde(rename = "insertIndex")]
        insert_index: usize,
        #[serde(rename = "insertPosition")]
        insert_position: Option<String>, // "above" | "below"
        #[serde(rename = "trackType")]
        track_type: String,
    },
}
