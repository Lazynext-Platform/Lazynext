use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use lazynext_core::nle_state::NLEState;
use serde_json::{Value, json};
use std::io::{self, BufRead};

/// Lazynext MCP Server — exposes the autonomous editor as an MCP tool.
///
/// Protocol: JSON-RPC 2.0 over stdio (Model Context Protocol).
/// Tools exposed:
///   - autonomous_edit: Execute an AI-powered video editing intent
///   - get_timeline_state: Return the current CRDT timeline as JSON
///   - apply_crdt_operation: Apply a serialized CRDT operation to the timeline
#[tokio::main]
async fn main() {
    eprintln!("🤖 Lazynext MCP Server started.");
    eprintln!("   Tools: autonomous_edit, get_timeline_state, apply_crdt_operation");

    let editor = AutonomousEditor::new();
    let mut nle = NLEState::new(
        "mcp_session".to_string(),
        "MCP Editor Session".to_string(),
        60,
    );

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let req_str = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if req_str.is_empty() {
            continue;
        }

        let req: Value = match serde_json::from_str(&req_str) {
            Ok(r) => r,
            Err(e) => {
                let err_resp = json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": {"code": -32700, "message": format!("Parse error: {}", e)}
                });
                println!("{}", err_resp);
                continue;
            }
        };

        let id = req.get("id").cloned().unwrap_or(Value::Null);
        let method = req["method"].as_str().unwrap_or("");

        let response = match method {
            "tools/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "tools": [
                        {
                            "name": "autonomous_edit",
                            "description": "Execute an AI-powered video editing intent on the CRDT timeline",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "prompt": {"type": "string", "description": "Natural language editing intent"},
                                    "require_plan_approval": {"type": "boolean", "default": true}
                                },
                                "required": ["prompt"]
                            }
                        },
                        {
                            "name": "get_timeline_state",
                            "description": "Return the current CRDT timeline state as JSON",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        },
                        {
                            "name": "apply_crdt_operation",
                            "description": "Apply a serialized CRDT operation to the timeline",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "operation": {"type": "object", "description": "Serialized CRDT operation"}
                                },
                                "required": ["operation"]
                            }
                        }
                    ]
                }
            }),

            "tools/call" => {
                let tool_name = req["params"]["name"].as_str().unwrap_or("");
                match tool_name {
                    "autonomous_edit" => {
                        let prompt = req["params"]["arguments"]["prompt"]
                            .as_str()
                            .unwrap_or("")
                            .to_string();
                        let require_plan_approval = req["params"]["arguments"]
                            .get("require_plan_approval")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(true);

                        let intent = VideoIntent {
                            prompt,
                            require_plan_approval,
                            source_files: vec![],
                        };

                        match editor.process_intent_with_llm(&mut nle, &intent).await {
                            Ok(msg) => json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": msg}],
                                    "isError": false
                                }
                            }),
                            Err(e) => json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": format!("Error: {}", e)}],
                                    "isError": true
                                }
                            }),
                        }
                    }

                    "get_timeline_state" => {
                        let data = nle.get_project_data();
                        let state_json = serde_json::to_string_pretty(data).unwrap_or_default();
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": state_json}],
                                "isError": false
                            }
                        })
                    }

                    "apply_crdt_operation" => {
                        let op_value = &req["params"]["arguments"]["operation"];
                        let op: Result<state::operations::CrdtOperation, _> =
                            serde_json::from_value(op_value.clone());
                        match op {
                            Ok(operation) => {
                                nle.op_log.push(operation);
                                json!({
                                    "jsonrpc": "2.0",
                                    "id": id,
                                    "result": {
                                        "content": [{"type": "text", "text": "Operation applied successfully."}],
                                        "isError": false
                                    }
                                })
                            }
                            Err(e) => json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": format!("Invalid operation: {}", e)}],
                                    "isError": true
                                }
                            }),
                        }
                    }

                    _ => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": {"code": -32601, "message": format!("Unknown tool: {}", tool_name)}
                    }),
                }
            }

            "initialize" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "lazynext-mcp-server",
                        "version": env!("CARGO_PKG_VERSION")
                    }
                }
            }),

            _ => json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": {"code": -32601, "message": format!("Method not found: {}", method)}
            }),
        };

        println!("{}", response);
    }
}
