//! Core types for the placement subsystem: `PlacementTimeSpan`,
//! `PlacementSubject`, `PlacementStrategy`, and `PlacementResult`.

/// A time span for placement, with the start time, duration, and an optional
/// exclusion of a specific element (used when moving/resizing an existing element).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlacementTimeSpan {
    /// Start time of the span in seconds.
    pub start_time: f64,
    /// Duration of the span in seconds.
    pub duration: f64,
    /// Element to exclude from overlap checks (e.g. the one being moved).
    pub exclude_element_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
/// What is being placed — either a typed element or a track type string.
pub enum PlacementSubject {
    /// A typed timeline element being placed.
    ElementType(String),
    /// A track type being placed.
    TrackType(String),
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
/// The strategy for resolving where a placement should land on the timeline.
pub enum PlacementStrategy {
    /// Place on an explicitly specified track.
    Explicit {
        /// Identifier of the target track.
        #[serde(rename = "trackId")]
        track_id: String,
    },
    /// Place on the first track that can accept the element.
    FirstAvailable,
    /// Prefer a specific track index, with hover/drag hints.
    PreferIndex {
        /// Preferred track index.
        #[serde(rename = "trackIndex")]
        track_index: usize,
        /// Hover direction relative to the track ("above" | "below").
        #[serde(rename = "hoverDirection")]
        hover_direction: String, // "above" | "below"
        /// Vertical drag direction, if any ("up" | "down").
        #[serde(rename = "verticalDragDirection")]
        vertical_drag_direction: Option<String>, // "up" | "down"
        /// Whether placement must create a new track.
        #[serde(rename = "createNewTrackOnly", default)]
        create_new_track_only: bool,
    },
    /// Place on a new track above the given source track.
    AboveSource {
        /// Index of the source track.
        #[serde(rename = "sourceTrackIndex")]
        source_track_index: usize,
    },
    /// Always create a new track at the given position.
    AlwaysNew {
        /// Placement position ("highest" | "default").
        position: String,
    }, // "highest" | "default"
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
/// The resolved result of a placement operation — either an existing track
/// that can accept the element(s) or a new track to be created.
pub enum PlacementResult {
    /// Place onto an existing track.
    ExistingTrack {
        /// Identifier of the resolved track.
        #[serde(rename = "trackId")]
        track_id: String,
        /// Index of the resolved track.
        #[serde(rename = "trackIndex")]
        track_index: usize,
        /// Type of the resolved track.
        #[serde(rename = "trackType")]
        track_type: String,
        /// Adjusted start time, if the placement was shifted.
        #[serde(rename = "adjustedStartTime")]
        adjusted_start_time: Option<f64>,
    },
    /// Create a new track for the placement.
    NewTrack {
        /// Index at which to insert the new track.
        #[serde(rename = "insertIndex")]
        insert_index: usize,
        /// Insert position relative to the reference track ("above" | "below").
        #[serde(rename = "insertPosition")]
        insert_position: Option<String>, // "above" | "below"
        /// Type of the new track.
        #[serde(rename = "trackType")]
        track_type: String,
    },
}
