//! Temporal versioning merge integration tests.
//!
//! Verifies branch isolation, merge semantics (track addition), and
//! guards against the data-corruption bug where clips leak to track 0.

use lazynext_core::NLEState;
use lazynext_temporal_versioning::MultiverseManager;

fn new_state() -> NLEState {
    NLEState::new("test-proj".to_string(), "Test Project".to_string(), 30)
}

/// Test that branch creates an independent copy.
#[test]
fn test_branch_isolation() {
    let canon = new_state();
    let mut mgr = MultiverseManager::new(canon);

    mgr.branch("experiment").expect("branch should succeed");
    mgr.checkout("experiment").expect("checkout should succeed");

    let branch = mgr.get_current_mut();
    branch.add_track("V2".to_string(), "video".to_string());

    mgr.checkout("canon").expect("checkout should succeed");
    let canon = mgr.get_current();
    assert!(
        !canon.get_project_data().tracks.iter().any(|t| t.id == "V2"),
        "Branch modifications should not leak to canon"
    );
}

/// Test that merging a branch with a new track adds it to the target.
#[test]
fn test_merge_adds_track() {
    let mut canon = new_state();
    canon.add_track("V1".to_string(), "video".to_string());
    let mut mgr = MultiverseManager::new(canon);

    mgr.branch("feature").expect("branch should create");
    mgr.checkout("feature").expect("checkout should work");

    let branch = mgr.get_current_mut();
    branch.add_track("V2".to_string(), "video".to_string());

    mgr.checkout("canon").expect("checkout should work");
    mgr.merge("feature", "canon").expect("merge should succeed");

    let canon = mgr.get_current();
    assert!(
        canon.get_project_data().tracks.iter().any(|t| t.id == "V2"),
        "Merged branch track should appear in canon"
    );
}

/// Test that merging a clip on a deleted track does NOT silently insert it
/// into track 0 (the data-corruption bug fix).
#[test]
fn test_merge_skips_clip_on_missing_track() {
    let mut canon = new_state();
    canon.add_track("V1".to_string(), "video".to_string());
    let mut mgr = MultiverseManager::new(canon);

    mgr.branch("alt").expect("branch should create");
    mgr.checkout("alt").expect("checkout should work");

    let branch = mgr.get_current_mut();
    branch.add_track("V2".to_string(), "video".to_string());
    let v2_idx = branch
        .get_project_data()
        .tracks
        .iter()
        .position(|t| t.id == "V2")
        .expect("V2 should exist");
    branch.add_clip_to_track(
        v2_idx,
        "clip_001".to_string(),
        "video".to_string(),
        "scene.mp4".to_string(),
        0,
        100,
    );

    // Switch to canon and merge — clip should be skipped since V2 doesn't exist
    mgr.checkout("canon").expect("checkout should work");
    mgr.merge("alt", "canon").expect("merge should succeed");

    let canon = mgr.get_current();
    let v1_clips = &canon.get_project_data().tracks[0].clips;
    assert!(
        !v1_clips.iter().any(|c| c.id == "clip_001"),
        "Clip meant for deleted track should NOT appear on track 0"
    );
}
