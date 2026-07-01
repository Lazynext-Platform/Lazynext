//! Overlap detection for timeline elements. Checks whether a new
//! element's time range would collide with any existing element on a track.

use crate::timeline::models::TimelineElement;
use crate::timeline::placement::types::PlacementTimeSpan;

/// Checks whether a new element with the given time range would overlap
/// any existing element on a track, optionally excluding a specific element
/// (e.g. when moving an existing element).
pub fn would_element_overlap(
    elements: &[TimelineElement],
    start_time: f64,
    end_time: f64,
    exclude_element_id: Option<&str>,
) -> bool {
    elements.iter().any(|element| {
        if let Some(exclude_id) = exclude_element_id
            && element.id == exclude_id
        {
            return false;
        }
        let element_end = element.start_time + element.duration;
        start_time < element_end && end_time > element.start_time
    })
}

/// Returns true if every time span in the list can be placed on the given
/// track without overlapping any existing element.
pub fn can_place_time_spans_on_track(
    elements: &[TimelineElement],
    time_spans: &[PlacementTimeSpan],
) -> bool {
    time_spans.iter().all(|span| {
        !would_element_overlap(
            elements,
            span.start_time,
            span.start_time + span.duration,
            span.exclude_element_id.as_deref(),
        )
    })
}
