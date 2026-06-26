use wasm_bindgen::prelude::*;
use lazynext_core::timeline::models::{SceneTracks, TimelineElement};
use lazynext_core::timeline::placement::types::{PlacementStrategy, PlacementSubject, PlacementTimeSpan};
use lazynext_core::timeline::placement::resolve::resolve_track_placement;
use lazynext_core::timeline::placement::types::PlacementResult;
use lazynext_core::timeline::placement::apply::{apply_placement, ApplyPlacementResult};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct WasmApplyPlacementResult {
    #[serde(rename = "updatedTracks")]
    pub updated_tracks: SceneTracks,
    #[serde(rename = "targetTrackId")]
    pub target_track_id: String,
}

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
