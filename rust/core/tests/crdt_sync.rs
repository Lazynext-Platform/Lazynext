use lazynext_core::NLEState;
use state::operations::{ClipPayload, CrdtOperation};

fn new_state() -> NLEState {
    NLEState::new("test-project".to_string(), "Test Project".to_string(), 30)
}

/// Test that CRDT operations from remote peers are properly applied,
/// not just logged.
#[test]
fn test_apply_remote_clip_insert() {
    let mut state = new_state();
    state.add_track("V1".to_string(), "video".to_string());

    let op = CrdtOperation::ClipInsert {
        clip_id: "clip_remote".to_string(),
        track_id: "V1".to_string(),
        position: 0,
        clip: ClipPayload {
            id: "clip_remote".to_string(),
            clip_type: "video".to_string(),
            name: "remote_clip.mp4".to_string(),
            start: 0,
            end: 50,
        },
    };

    state.apply_operation(op);

    let data = state.get_project_data();
    let v1 = &data.tracks[0];
    assert!(
        v1.clips.iter().any(|c| c.id == "clip_remote"),
        "Remote clip insert should be applied to project data"
    );
}

/// Test that a remote clip delete marks a tombstone.
#[test]
fn test_apply_remote_clip_delete() {
    let mut state = new_state();
    state.add_track("V1".to_string(), "video".to_string());
    state.add_clip_to_track(
        0,
        "c1".to_string(),
        "video".to_string(),
        "a.mp4".to_string(),
        0,
        100,
    );

    let delete_op = CrdtOperation::ClipDelete {
        clip_id: "c1".to_string(),
        track_id: "V1".to_string(),
    };

    state.apply_operation(delete_op);

    assert!(
        state.tombstones.is_deleted("c1"),
        "Remote clip delete should mark a tombstone"
    );
}

/// Test LWW: remote track insert is idempotent.
#[test]
fn test_apply_remote_track_insert_idempotent() {
    let mut state = new_state();
    state.add_track("V1".to_string(), "video".to_string());

    let op = CrdtOperation::TrackInsert {
        track_id: "V1".to_string(),
        kind: "video".to_string(),
        position: 0,
    };

    state.apply_operation(op);

    let data = state.get_project_data();
    assert_eq!(
        data.tracks.iter().filter(|t| t.id == "V1").count(),
        1,
        "Duplicate track insert should be idempotent"
    );
}
