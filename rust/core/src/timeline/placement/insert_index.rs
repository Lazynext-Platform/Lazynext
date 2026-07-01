//! Computes the correct insertion index for new tracks based on
//! track type, preferred position, and directional hints ("above"/"below").

use crate::timeline::models::SceneTracks;

/// Returns the default insertion index for a new track of the given type.
///
/// - Audio tracks are placed after the main track and all overlay tracks.
/// - Effect tracks are placed at index 0 (top).
/// - All other track types are placed just above the main track.
pub fn get_default_insert_index_for_track(tracks: &SceneTracks, track_type: &str) -> usize {
    if track_type == "audio" {
        return tracks.overlay.len() + 1 + tracks.audio.len();
    }

    if track_type == "effect" {
        return 0;
    }

    tracks.overlay.len()
}

/// Returns the highest (topmost) possible insertion index for a new track
/// of the given type. For audio tracks this is immediately after the main
/// track; all other types return index 0.
pub fn get_highest_insert_index_for_track(tracks: &SceneTracks, track_type: &str) -> usize {
    if track_type == "audio" {
        return tracks.overlay.len() + 1;
    }

    0
}

/// The computed placement for a new track: its insert index and an optional
/// positional hint ("above" or "below").
pub struct PreferredNewTrackPlacement {
    pub insert_index: usize,
    pub insert_position: Option<String>,
}

/// Resolves the optimal position for a new track, taking into account the
/// current track layout, the preferred index, and the placement direction
/// ("above" or "below").
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
