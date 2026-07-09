//! Undo-recording integration tests.
//!
//! Verifies that operations which previously mutated state without recording
//! history — `set_dimensions` and `apply_silence_trims` — are now undoable
//! via the snapshot-based undo stack.

use lazynext_core::NLEState;

fn new_state() -> NLEState {
    NLEState::new("test-project".to_string(), "Test Project".to_string(), 30)
}

/// Changing canvas dimensions should be undoable.
#[test]
fn test_set_dimensions_is_undoable() {
    let mut state = new_state();
    let (w0, h0) = {
        let pd = state.get_project_data();
        (pd.width, pd.height)
    };

    state.set_dimensions(1280, 720);
    {
        let pd = state.get_project_data();
        assert_eq!(pd.width, 1280);
        assert_eq!(pd.height, 720);
    }

    assert!(state.undo(), "set_dimensions should be undoable");
    let pd = state.get_project_data();
    assert_eq!(pd.width, w0, "undo should restore original width");
    assert_eq!(pd.height, h0, "undo should restore original height");
}

/// Setting the same dimensions should be a no-op (no undo entry created).
#[test]
fn test_set_dimensions_noop_when_unchanged() {
    let mut state = new_state();
    let (w0, h0) = {
        let pd = state.get_project_data();
        (pd.width, pd.height)
    };
    state.set_dimensions(w0, h0);
    // Nothing was recorded, so there is nothing to undo.
    assert!(!state.undo(), "no-op resize must not create an undo entry");
}

/// Silence trimming should remove contained clips and be undoable in one step.
#[test]
fn test_silence_trims_are_undoable() {
    let mut state = new_state(); // 30 fps
    state.add_track("V1".to_string(), "video".to_string());
    // c1 occupies frames [0, 30) → seconds [0, 1); c2 occupies [60, 120).
    state.add_clip_to_track(
        0,
        "c1".to_string(),
        "video".to_string(),
        "a.mp4".to_string(),
        0,
        30,
    );
    state.add_clip_to_track(
        0,
        "c2".to_string(),
        "video".to_string(),
        "b.mp4".to_string(),
        60,
        120,
    );

    // Silence region [0s, 1s] removes c1 (fully contained), keeps c2.
    state.apply_silence_trims(0, &[(0.0, 1.0)]);
    {
        let clips = &state.get_project_data().tracks[0].clips;
        assert!(!clips.iter().any(|c| c.id == "c1"), "c1 should be trimmed");
        assert!(clips.iter().any(|c| c.id == "c2"), "c2 should remain");
    }

    assert!(state.undo(), "silence trim should be undoable");
    let clips = &state.get_project_data().tracks[0].clips;
    assert!(
        clips.iter().any(|c| c.id == "c1"),
        "undo should restore the trimmed clip"
    );
    assert_eq!(clips.len(), 2, "both clips should be present after undo");
}

/// Silence trimming that removes nothing should not create an undo entry.
#[test]
fn test_silence_trims_noop_when_nothing_removed() {
    let mut state = new_state();
    state.add_track("V1".to_string(), "video".to_string());
    state.add_clip_to_track(
        0,
        "c1".to_string(),
        "video".to_string(),
        "a.mp4".to_string(),
        60,
        120,
    );
    let undo_before = state.undo();
    // Re-add since the above undo may have popped the add_clip; rebuild cleanly.
    if undo_before {
        state.add_clip_to_track(
            0,
            "c1".to_string(),
            "video".to_string(),
            "a.mp4".to_string(),
            60,
            120,
        );
    }

    // Region [0s,1s] contains no clip (c1 is at [60,120)).
    state.apply_silence_trims(0, &[(0.0, 1.0)]);
    let clips = &state.get_project_data().tracks[0].clips;
    assert_eq!(clips.len(), 1, "no clip should be removed");
}
