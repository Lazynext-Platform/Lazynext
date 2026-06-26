use crate::timeline::models::{SceneTracks, TimelineElement, TimelineTrack};

pub const MAIN_TRACK_NAME: &str = "Main Track";
const ZERO_MEDIA_TIME: f64 = 0.0;

pub fn get_earliest_main_track_element<'a>(
    main_track: &'a TimelineTrack,
    exclude_element_id: Option<&str>,
) -> Option<&'a TimelineElement> {
    main_track
        .elements
        .iter()
        .filter(|element| match exclude_element_id {
            Some(exclude_id) => element.id != exclude_id,
            None => true,
        })
        .min_by(|a, b| {
            a.start_time
                .partial_cmp(&b.start_time)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
}

pub fn enforce_main_track_start(
    tracks: &SceneTracks,
    target_track_id: &str,
    requested_start_time: f64,
    exclude_element_id: Option<&str>,
) -> f64 {
    if tracks.main.id != target_track_id {
        return requested_start_time;
    }

    if let Some(earliest_element) =
        get_earliest_main_track_element(&tracks.main, exclude_element_id)
    {
        if requested_start_time <= earliest_element.start_time {
            return ZERO_MEDIA_TIME;
        }
        return requested_start_time;
    }

    ZERO_MEDIA_TIME
}
