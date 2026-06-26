use crate::timeline::models::SceneTracks;

pub fn get_default_insert_index_for_track(tracks: &SceneTracks, track_type: &str) -> usize {
    if track_type == "audio" {
        return tracks.overlay.len() + 1 + tracks.audio.len();
    }

    if track_type == "effect" {
        return 0;
    }

    tracks.overlay.len()
}

pub fn get_highest_insert_index_for_track(tracks: &SceneTracks, track_type: &str) -> usize {
    if track_type == "audio" {
        return tracks.overlay.len() + 1;
    }

    0
}

pub struct PreferredNewTrackPlacement {
    pub insert_index: usize,
    pub insert_position: Option<String>,
}

pub fn resolve_preferred_new_track_placement(
    tracks: &SceneTracks,
    track_type: &str,
    preferred_index: usize,
    direction: &str, // "above" | "below"
) -> PreferredNewTrackPlacement {
    let track_count = tracks.overlay.len() + 1 + tracks.audio.len();
    
    if track_count == 0 {
        return PreferredNewTrackPlacement {
            insert_index: 0,
            insert_position: if track_type == "audio" {
                Some("below".to_string())
            } else {
                None
            },
        };
    }

    let safe_preferred_index = preferred_index.min(track_count.saturating_sub(1));
    let main_track_index = tracks.overlay.len();

    if track_type == "audio" {
        if safe_preferred_index <= main_track_index {
            return PreferredNewTrackPlacement {
                insert_index: main_track_index + 1,
                insert_position: Some("below".to_string()),
            };
        }

        return PreferredNewTrackPlacement {
            insert_index: if direction == "above" {
                safe_preferred_index
            } else {
                safe_preferred_index + 1
            },
            insert_position: Some(direction.to_string()),
        };
    }

    let insert_index = if direction == "above" {
        safe_preferred_index
    } else {
        safe_preferred_index + 1
    };

    if insert_index > main_track_index {
        return PreferredNewTrackPlacement {
            insert_index: main_track_index,
            insert_position: Some("above".to_string()),
        };
    }

    PreferredNewTrackPlacement {
        insert_index,
        insert_position: Some(direction.to_string()),
    }
}
