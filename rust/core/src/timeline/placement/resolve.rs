use crate::timeline::models::{SceneTracks, TimelineTrack};
use crate::timeline::placement::compatibility::get_track_type_for_element_type;
use crate::timeline::placement::insert_index::{
    get_default_insert_index_for_track, get_highest_insert_index_for_track,
    resolve_preferred_new_track_placement,
};
use crate::timeline::placement::main_track::enforce_main_track_start;
use crate::timeline::placement::overlap::can_place_time_spans_on_track;
use crate::timeline::placement::types::{
    PlacementResult, PlacementStrategy, PlacementSubject, PlacementTimeSpan,
};

const ZERO_MEDIA_TIME: f64 = 0.0;

fn build_existing_track_result(
    track: &TimelineTrack,
    track_index: usize,
    tracks: &SceneTracks,
    time_spans: &[PlacementTimeSpan],
) -> PlacementResult {
    let first_span = time_spans.first();
    let requested_start_time = first_span.map(|s| s.start_time).unwrap_or(ZERO_MEDIA_TIME);
    let exclude_element_id = first_span.and_then(|s| s.exclude_element_id.as_deref());

    let adjusted_start_time =
        enforce_main_track_start(tracks, &track.id, requested_start_time, exclude_element_id);

    let adjusted_start_time = if (adjusted_start_time - requested_start_time).abs() > f64::EPSILON {
        Some(adjusted_start_time)
    } else {
        None
    };

    PlacementResult::ExistingTrack {
        track_id: track.id.clone(),
        track_index,
        track_type: track.r#type.clone(),
        adjusted_start_time,
    }
}

fn build_new_track_result(
    track_type: String,
    insert_index: usize,
    insert_position: Option<String>,
) -> PlacementResult {
    PlacementResult::NewTrack {
        insert_index,
        insert_position,
        track_type,
    }
}

fn find_first_available_track_index(
    ordered_tracks: &[&TimelineTrack],
    track_type: &str,
    time_spans: &[PlacementTimeSpan],
) -> Option<usize> {
    ordered_tracks.iter().position(|&track| {
        track.r#type == track_type && can_place_time_spans_on_track(&track.elements, time_spans)
    })
}

fn resolve_always_new_track(
    tracks: &SceneTracks,
    track_type: &str,
    position: &str,
) -> PlacementResult {
    let insert_index = if position == "highest" {
        get_highest_insert_index_for_track(tracks, track_type)
    } else {
        get_default_insert_index_for_track(tracks, track_type)
    };

    build_new_track_result(track_type.to_string(), insert_index, None)
}

fn get_insert_direction<'a>(
    hover_direction: &'a str,
    vertical_drag_direction: Option<&'a str>,
) -> &'a str {
    if let Some(v_dir) = vertical_drag_direction {
        if v_dir == "up" {
            return "above";
        }
        if v_dir == "down" {
            return "below";
        }
    }
    hover_direction
}

pub fn resolve_track_placement(
    tracks: &SceneTracks,
    subject: &PlacementSubject,
    time_spans: &[PlacementTimeSpan],
    strategy: &PlacementStrategy,
) -> Option<PlacementResult> {
    let mut ordered_tracks: Vec<&TimelineTrack> = Vec::new();
    for track in &tracks.overlay {
        ordered_tracks.push(track);
    }
    ordered_tracks.push(&tracks.main);
    for track in &tracks.audio {
        ordered_tracks.push(track);
    }

    let track_type = match subject {
        PlacementSubject::ElementType(element_type) => {
            get_track_type_for_element_type(element_type).to_string()
        }
        PlacementSubject::TrackType(tt) => tt.clone(),
    };

    match strategy {
        PlacementStrategy::Explicit { track_id } => {
            let track_index = ordered_tracks.iter().position(|t| &t.id == track_id)?;
            let track = ordered_tracks[track_index];
            if track.r#type != track_type {
                return None;
            }
            Some(build_existing_track_result(
                track,
                track_index,
                tracks,
                time_spans,
            ))
        }
        PlacementStrategy::FirstAvailable => {
            if let Some(existing_track_index) =
                find_first_available_track_index(&ordered_tracks, &track_type, time_spans)
            {
                let track = ordered_tracks[existing_track_index];
                Some(build_existing_track_result(
                    track,
                    existing_track_index,
                    tracks,
                    time_spans,
                ))
            } else {
                Some(resolve_always_new_track(tracks, &track_type, "highest"))
            }
        }
        PlacementStrategy::PreferIndex {
            track_index,
            hover_direction,
            vertical_drag_direction,
            create_new_track_only,
        } => {
            let preferred_track_opt = ordered_tracks.get(*track_index);
            let is_preferred_track_compatible = preferred_track_opt
                .map(|t| t.r#type == track_type)
                .unwrap_or(false);

            let can_use_existing_track = !create_new_track_only
                && is_preferred_track_compatible
                && can_place_time_spans_on_track(
                    &preferred_track_opt.unwrap().elements,
                    time_spans,
                );

            if can_use_existing_track {
                return Some(build_existing_track_result(
                    preferred_track_opt.unwrap(),
                    *track_index,
                    tracks,
                    time_spans,
                ));
            }

            let direction = get_insert_direction(
                hover_direction,
                if !is_preferred_track_compatible {
                    vertical_drag_direction.as_deref()
                } else {
                    None
                },
            );

            let preferred_new_track =
                resolve_preferred_new_track_placement(tracks, &track_type, *track_index, direction);

            Some(build_new_track_result(
                track_type.clone(),
                preferred_new_track.insert_index,
                preferred_new_track.insert_position,
            ))
        }
        PlacementStrategy::AboveSource { source_track_index } => {
            if *source_track_index > 0 {
                let above_track_index = source_track_index - 1;
                if let Some(above_track) = ordered_tracks.get(above_track_index) {
                    if above_track.r#type == track_type
                        && can_place_time_spans_on_track(&above_track.elements, time_spans)
                    {
                        return Some(build_existing_track_result(
                            above_track,
                            above_track_index,
                            tracks,
                            time_spans,
                        ));
                    }
                }
            }

            if let Some(first_available) =
                find_first_available_track_index(&ordered_tracks, &track_type, time_spans)
            {
                return Some(build_existing_track_result(
                    ordered_tracks[first_available],
                    first_available,
                    tracks,
                    time_spans,
                ));
            }

            let insert_index = get_highest_insert_index_for_track(tracks, &track_type);
            Some(build_new_track_result(
                track_type.clone(),
                insert_index,
                None,
            ))
        }
        PlacementStrategy::AlwaysNew { position } => {
            Some(resolve_always_new_track(tracks, &track_type, position))
        }
    }
}
