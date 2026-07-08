//! Applies a resolved placement decision to the scene track layout,
//! inserting elements into an existing or newly created track.

use crate::timeline::models::{SceneTracks, TimelineElement, TimelineTrack};
use crate::timeline::placement::track_factory::build_empty_track;
use crate::timeline::placement::types::PlacementResult;
use uuid::Uuid;

/// The result of applying a placement decision: the updated scene tracks
/// and the ID of the track that received the elements.
pub struct ApplyPlacementResult {
    /// Scene tracks after the placement was applied.
    pub updated_tracks: SceneTracks,
    /// Identifier of the track that received the elements.
    pub target_track_id: String,
}

/// Applies a resolved placement result to the scene tracks, adding elements
/// to either an existing track or a newly created one. An optional override
/// can specify a different insert index for a new track.
pub fn apply_placement(
    tracks: &SceneTracks,
    placement_result: &PlacementResult,
    elements: &[TimelineElement],
    new_track_insert_index_override: Option<usize>,
) -> Option<ApplyPlacementResult> {
    match placement_result {
        PlacementResult::ExistingTrack { track_index, .. } => {
            let mut all_tracks: Vec<&TimelineTrack> = Vec::new();
            for t in &tracks.overlay {
                all_tracks.push(t);
            }
            all_tracks.push(&tracks.main);
            for t in &tracks.audio {
                all_tracks.push(t);
            }

            if *track_index >= all_tracks.len() {
                return None;
            }
            let target_track = all_tracks[*track_index];
            let target_track_id = target_track.id.clone();

            let mut updated_tracks = tracks.clone();

            // updateTrackInSceneTracks equivalent
            let mut updated = false;
            for t in &mut updated_tracks.overlay {
                if t.id == target_track_id {
                    t.elements.extend(elements.iter().cloned());
                    updated = true;
                    break;
                }
            }
            if !updated && updated_tracks.main.id == target_track_id {
                updated_tracks
                    .main
                    .elements
                    .extend(elements.iter().cloned());
                updated = true;
            }
            if !updated {
                for t in &mut updated_tracks.audio {
                    if t.id == target_track_id {
                        t.elements.extend(elements.iter().cloned());
                        break;
                    }
                }
            }

            Some(ApplyPlacementResult {
                updated_tracks,
                target_track_id,
            })
        }
        PlacementResult::NewTrack {
            track_type,
            insert_index,
            ..
        } => {
            let new_track_id = Uuid::new_v4().to_string();
            let actual_insert_index = new_track_insert_index_override.unwrap_or(*insert_index);

            let mut new_track = build_empty_track(new_track_id.clone(), track_type, None);
            new_track.elements.extend(elements.iter().cloned());

            let mut updated_tracks = tracks.clone();

            if track_type == "audio" {
                let audio_insert_index =
                    actual_insert_index.saturating_sub(tracks.overlay.len() + 1);
                let audio_insert_index = audio_insert_index.min(updated_tracks.audio.len());
                updated_tracks.audio.insert(audio_insert_index, new_track);
            } else {
                let overlay_insert_index = actual_insert_index.min(updated_tracks.overlay.len());
                updated_tracks
                    .overlay
                    .insert(overlay_insert_index, new_track);
            }

            Some(ApplyPlacementResult {
                updated_tracks,
                target_track_id: new_track_id,
            })
        }
    }
}
