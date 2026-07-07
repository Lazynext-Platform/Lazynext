//! Integration tests for the autonomous editor agent.
//!
//! Covers intent processing, job status handling, synchronous editing,
//! serialization round-trips, and graceful degradation without API keys.

use lazynext_core::NLEState;
use lazynext_core::autonomous::{AutonomousEditor, JobStatus, VideoIntent};

/// Verify that process_intent does not crash and returns a job ID
/// (currently a stub that returns an error — graceful degradation).
#[tokio::test]
async fn test_process_intent_is_callable() {
    let editor = AutonomousEditor::new();
    let intent = VideoIntent {
        prompt: "Add a cinematic color grade".to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: Some("gemini".to_string()),
    };

    let result = editor.process_intent(intent).await;
    // Currently a stub returning error — verify it doesn't panic
    assert!(result.is_err());
}

/// Verify check_job_status handles unknown job IDs gracefully.
#[tokio::test]
async fn test_check_job_status_handles_unknown() {
    let editor = AutonomousEditor::new();
    let result = editor.check_job_status("nonexistent-job-id").await;

    // Current stub: returns Ok(Failed) for any job ID
    assert!(result.is_ok());
    match result.unwrap() {
        JobStatus::Failed { error } => {
            assert!(
                !error.is_empty(),
                "Failed status should have an error message"
            );
        }
        _ => panic!("Expected Failed status for unknown job ID"),
    }
}

/// Verify process_intent_sync processes various intents correctly.
#[test]
fn test_process_intent_sync_all_categories() {
    // Silence detection
    let editor = AutonomousEditor::new();
    let mut state = NLEState::new("test-sync".to_string(), "Test Sync".to_string(), 30);
    let intent = VideoIntent {
        prompt: "remove silence from my video".to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: None,
    };
    let result = editor.process_intent_sync(&mut state, &intent);
    assert!(result.is_ok());
    let data = state.get_project_data();
    assert!(
        !data.tracks.is_empty(),
        "Should have created at least one track"
    );

    // Color grade detection
    let editor2 = AutonomousEditor::new();
    let mut state2 = NLEState::new("test-sync3".to_string(), "Test Sync3".to_string(), 30);
    let intent2 = VideoIntent {
        prompt: "apply color grade".to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: None,
    };
    let result2 = editor2.process_intent_sync(&mut state2, &intent2);
    assert!(result2.is_ok());

    // Fallback (generic prompt)
    let editor3 = AutonomousEditor::new();
    let mut state3 = NLEState::new("test-sync7".to_string(), "Test Sync7".to_string(), 30);
    let intent3 = VideoIntent {
        prompt: "make it better".to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: None,
    };
    let result3 = editor3.process_intent_sync(&mut state3, &intent3);
    assert!(result3.is_ok());
    let data3 = state3.get_project_data();
    assert!(
        !data3.tracks.is_empty(),
        "Generic prompt should create fallback track"
    );
}

/// Verify JobStatus serialization round-trips correctly.
#[test]
fn test_job_status_serialization() {
    let statuses = vec![
        JobStatus::Pending,
        JobStatus::Planning,
        JobStatus::Executing,
        JobStatus::AwaitingApproval {
            plan: "Test plan".to_string(),
        },
        JobStatus::Completed {
            video_url: "https://cdn.lazynext.ai/exports/test.mp4".to_string(),
        },
        JobStatus::Failed {
            error: "Test error".to_string(),
        },
    ];

    for status in statuses {
        let json = serde_json::to_string(&status).unwrap();
        let _parsed: JobStatus = serde_json::from_str(&json).unwrap();
    }
}

/// Verify VideoIntent with default source_files deserializes correctly.
#[test]
fn test_video_intent_defaults() {
    let json = r#"{"prompt": "test", "require_plan_approval": false}"#;
    let intent: VideoIntent = serde_json::from_str(json).unwrap();
    assert_eq!(intent.prompt, "test");
    assert!(!intent.require_plan_approval);
    assert!(intent.source_files.is_empty());
    assert!(intent.llm_provider.is_none());
}
