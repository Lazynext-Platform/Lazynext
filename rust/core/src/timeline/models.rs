use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineTrack {
    pub id: String,
    pub r#type: String,
    pub elements: Vec<TimelineElement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneTracks {
    pub overlay: Vec<TimelineTrack>,
    pub main: TimelineTrack,
    pub audio: Vec<TimelineTrack>,
}
