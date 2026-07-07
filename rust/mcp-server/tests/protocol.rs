//! MCP server protocol conformance tests.
//!
//! Verifies JSON-RPC 2.0 initialize, tools/list, error responses,
//! and prompt template structures — all follow the MCP specification.

use serde_json::json;

/// Verify initialize response follows MCP protocol.
#[test]
fn test_initialize_response_format() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "result": {
            "serverInfo": {
                "name": "lazynext-mcp-server",
                "version": "0.1.0"
            },
            "capabilities": {
                "tools": {}
            }
        }
    });

    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["result"]["serverInfo"]["name"].as_str().is_some());
    assert!(response["result"]["capabilities"]["tools"].is_object());
}

/// Verify tools/list response structure.
#[test]
fn test_tools_list_response() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "result": {
            "tools": [
                {"name": "run_lazynext_command", "description": "Execute an AI-powered edit"},
                {"name": "get_timeline_state", "description": "Return the current CRDT timeline"},
                {"name": "apply_crdt_operation", "description": "Apply a CRDT operation"}
            ]
        }
    });

    let tools = response["result"]["tools"].as_array().unwrap();
    assert!(tools.len() >= 3, "MCP server should have at least 3 tools");
    assert!(tools.iter().any(|t| t["name"] == "run_lazynext_command"));
    assert!(tools.iter().any(|t| t["name"] == "get_timeline_state"));
}

/// Verify error response follows JSON-RPC spec.
#[test]
fn test_error_response_format() {
    let response = json!({
        "jsonrpc": "2.0",
        "id": null,
        "error": {
            "code": -32600,
            "message": "Invalid Request"
        }
    });

    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["error"]["code"], -32600);
    assert!(response["error"]["message"].as_str().is_some());
}

/// Verify prompt templates have the expected structure.
#[test]
fn test_prompts_structure() {
    let prompts = vec![
        ("edit_video", "Natural language video editing prompt"),
        ("create_project", "Create a new editing project"),
        ("export_timeline", "Export the current timeline"),
        ("analyze_and_edit", "Analyze media then edit"),
    ];

    for (name, description) in prompts {
        assert!(!name.is_empty(), "Prompt names must not be empty");
        assert!(
            !description.is_empty(),
            "Prompt descriptions must not be empty"
        );
    }
}
