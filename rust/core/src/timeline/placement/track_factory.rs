use crate::timeline::models::TimelineTrack;

pub fn default_track_name(track_type: &str) -> &str {
    match track_type {
        "video" => "Video Track",
        "audio" => "Audio Track",
        "text" => "Text Track",
        "graphic" => "Graphic Track",
        "effect" => "Effect Track",
        _ => "Track",
    }
}

pub fn build_empty_track(id: String, track_type: &str, name: Option<String>) -> TimelineTrack {
    let track_name = name.unwrap_or_else(|| default_track_name(track_type).to_string());

    TimelineTrack {
        id,
        r#type: track_type.to_string(),
        elements: Vec::new(),
    }
}
