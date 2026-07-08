//! WASM bridge for timeline placement and editing operations.
//!
//! Exposes track placement resolution, element placement/application,
//! combined place-on-timeline, and element deletion — consuming
//! serialized `SceneTracks` from JavaScript and returning updated tracks.

use lazynext_core::timeline::models::{SceneTracks, TimelineElement};
use lazynext_core::timeline::placement::apply::{ApplyPlacementResult, apply_placement};
use lazynext_core::timeline::placement::resolve::resolve_track_placement;
use lazynext_core::timeline::placement::types::PlacementResult;
use lazynext_core::timeline::placement::types::{
    PlacementStrategy, PlacementSubject, PlacementTimeSpan,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// A `(trackId, elementId)` pair identifying an element to delete.
#[derive(Deserialize)]
pub struct TargetElement {
    /// ID of the track containing the element.
    #[serde(rename = "trackId")]
    pub track_id: String,
    /// ID of the element within the track.
    #[serde(rename = "elementId")]
    pub element_id: String,
}

/// Result of applying a placement: the updated tracks and the track the
/// elements landed on.
#[derive(Serialize, Deserialize)]
pub struct WasmApplyPlacementResult {
    /// The full set of tracks after the placement was applied.
    #[serde(rename = "updatedTracks")]
    pub updated_tracks: SceneTracks,
    /// ID of the track the elements were placed on.
    #[serde(rename = "targetTrackId")]
    pub target_track_id: String,
}

/// Resolves where elements should be placed without mutating the timeline.
///
/// Returns the serialized [`PlacementResult`], or JS `null` if no valid
/// placement exists for the given subject, time spans, and strategy.
#[wasm_bindgen(js_name = resolveTrackPlacement)]
pub fn wasm_resolve_track_placement(
    tracks_js: JsValue,
    subject_js: JsValue,
    time_spans_js: JsValue,
    strategy_js: JsValue,
) -> Result<JsValue, JsValue> {
    let tracks: SceneTracks = serde_wasm_bindgen::from_value(tracks_js)?;
    let subject: PlacementSubject = serde_wasm_bindgen::from_value(subject_js)?;
    let time_spans: Vec<PlacementTimeSpan> = serde_wasm_bindgen::from_value(time_spans_js)?;
    let strategy: PlacementStrategy = serde_wasm_bindgen::from_value(strategy_js)?;

    let placement_result_opt = resolve_track_placement(&tracks, &subject, &time_spans, &strategy);
    if let Some(res) = placement_result_opt {
        return Ok(serde_wasm_bindgen::to_value(&res)?);
    }
    Ok(JsValue::NULL)
}

/// Applies a previously resolved placement to the tracks, inserting the
/// given elements.
///
/// Returns the updated tracks and target track ID, or JS `null` if the
/// placement could not be applied.
#[wasm_bindgen(js_name = applyPlacement)]
pub fn wasm_apply_placement(
    tracks_js: JsValue,
    placement_result_js: JsValue,
    elements_js: JsValue,
    new_track_insert_index_override: Option<usize>,
) -> Result<JsValue, JsValue> {
    let tracks: SceneTracks = serde_wasm_bindgen::from_value(tracks_js)?;
    let placement_result: PlacementResult = serde_wasm_bindgen::from_value(placement_result_js)?;
    let elements: Vec<TimelineElement> = serde_wasm_bindgen::from_value(elements_js)?;

    if let Some(apply_result) = apply_placement(
        &tracks,
        &placement_result,
        &elements,
        new_track_insert_index_override,
    ) {
        let result = WasmApplyPlacementResult {
            updated_tracks: apply_result.updated_tracks,
            target_track_id: apply_result.target_track_id,
        };
        return Ok(serde_wasm_bindgen::to_value(&result)?);
    }
    Ok(JsValue::NULL)
}

/// Resolves placement and applies it in one call — the common path for
/// dropping new elements onto the timeline.
///
/// Returns the updated tracks and target track ID, or JS `null` if no valid
/// placement exists or it could not be applied.
#[wasm_bindgen(js_name = placeElementsOnTimeline)]
pub fn place_elements_on_timeline(
    tracks_js: JsValue,
    subject_js: JsValue,
    time_spans_js: JsValue,
    strategy_js: JsValue,
    elements_js: JsValue,
    new_track_insert_index_override: Option<usize>,
) -> Result<JsValue, JsValue> {
    let tracks: SceneTracks = serde_wasm_bindgen::from_value(tracks_js)?;
    let subject: PlacementSubject = serde_wasm_bindgen::from_value(subject_js)?;
    let time_spans: Vec<PlacementTimeSpan> = serde_wasm_bindgen::from_value(time_spans_js)?;
    let strategy: PlacementStrategy = serde_wasm_bindgen::from_value(strategy_js)?;
    let elements: Vec<TimelineElement> = serde_wasm_bindgen::from_value(elements_js)?;

    let placement_result_opt = resolve_track_placement(&tracks, &subject, &time_spans, &strategy);

    if let Some(placement_result) = placement_result_opt {
        if let Some(apply_result) = apply_placement(
            &tracks,
            &placement_result,
            &elements,
            new_track_insert_index_override,
        ) {
            let result = WasmApplyPlacementResult {
                updated_tracks: apply_result.updated_tracks,
                target_track_id: apply_result.target_track_id,
            };
            return Ok(serde_wasm_bindgen::to_value(&result)?);
        }
    }

    Ok(JsValue::NULL)
}

/// Removes the given target elements from the main, overlay, and audio
/// tracks, returning the updated [`SceneTracks`].
#[wasm_bindgen(js_name = deleteElements)]
pub fn wasm_delete_elements(tracks_js: JsValue, elements_js: JsValue) -> Result<JsValue, JsValue> {
    let mut tracks: SceneTracks = serde_wasm_bindgen::from_value(tracks_js)?;
    let targets: Vec<TargetElement> = serde_wasm_bindgen::from_value(elements_js)?;

    let target_contains = |track_id: &str, element_id: &str| -> bool {
        targets
            .iter()
            .any(|t| t.track_id == track_id && t.element_id == element_id)
    };

    for track in tracks.overlay.iter_mut() {
        let tid = track.id.clone();
        track.elements.retain(|e| !target_contains(&tid, &e.id));
    }

    {
        let tid = tracks.main.id.clone();
        tracks
            .main
            .elements
            .retain(|e| !target_contains(&tid, &e.id));
    }

    for track in tracks.audio.iter_mut() {
        let tid = track.id.clone();
        track.elements.retain(|e| !target_contains(&tid, &e.id));
    }

    Ok(serde_wasm_bindgen::to_value(&tracks)?)
}
