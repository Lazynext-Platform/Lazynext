use crate::timeline::models::TimelineTrack;

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlacementTimeSpan {
    pub start_time: f64,
    pub duration: f64,
    pub exclude_element_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum PlacementSubject {
    ElementType(String),
    TrackType(String),
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
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
    AlwaysNew { position: String }, // "highest" | "default"
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
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
