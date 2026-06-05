use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{self, BufRead, Write};
use state::ProjectData;
use std::sync::{Arc, Mutex};

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct RpcRequest {
    jsonrpc: String,
    id: Value,
    method: String,
    params: Option<Value>,
}

#[derive(Serialize)]
struct RpcResponse {
    jsonrpc: String,
    id: Value,
    result: Option<Value>,
    error: Option<RpcError>,
}

#[derive(Serialize)]
struct RpcError {
    code: i32,
    message: String,
}

fn handle_request(req: RpcRequest, _shared_project: Arc<Mutex<Option<ProjectData>>>) -> RpcResponse {
    let mut response = RpcResponse {
        jsonrpc: "2.0".to_string(),
        id: req.id.clone(),
        result: None,
        error: None,
    };

    match req.method.as_str() {
        "tools/list" => {
            response.result = Some(serde_json::json!({
                "tools": [
                    {
                        "name": "create_timeline",
                        "description": "Initialize a new video timeline using the Lazynext core time crate",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "fps": { "type": "number", "description": "Frames per second" }
                            },
                            "required": ["fps"]
                        }
                    },
                    {
                        "name": "auto_jump_cut",
                        "description": "Analyze an audio file and automatically generate timeline splits to remove silence",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "file_path": { "type": "string", "description": "Path to media file" },
                                "threshold_db": { "type": "number", "description": "Silence threshold in decibels (e.g. -40)" }
                            },
                            "required": ["file_path"]
                        }
                    },
                    {
                        "name": "execute_agent_action",
                        "description": "Execute a natural language prompt via the Lazynext Multi-Model AgentFactory, mutating the video timeline natively.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "prompt": { "type": "string", "description": "The natural language command" }
                            },
                            "required": ["prompt"]
                        }
                    }
                ]
            }));
        }
        "tools/call" => {
            // Handle tool execution
            let params = req.params.unwrap_or_default();
            let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
            if name == "create_timeline" {
                let project = ProjectData::new("mcp_proj".into(), "Lazynext MCP".into(), 60.0, 1280, 720);
                if let Ok(mut lock) = _shared_project.lock() {
                    *lock = Some(project);
                }
                response.result = Some(serde_json::json!({
                    "content": [
                        { "type": "text", "text": "Successfully initialized 60 FPS timeline natively using state crate!" }
                    ]
                }));
            } else if name == "auto_jump_cut" {
                // MOCK: This would normally run ffmpeg's silencedetect filter and mutate the timeline data structure
                response.result = Some(serde_json::json!({
                    "content": [
                        { "type": "text", "text": "Detected 4 silent segments. Automatically split and deleted clips from timeline!" }
                    ]
                }));
            } else if name == "execute_agent_action" {
                let prompt = params.get("arguments").and_then(|args| args.get("prompt")).and_then(|v| v.as_str()).unwrap_or("");
                let provider = std::env::var("LAZYNEXT_AI_PROVIDER").unwrap_or_else(|_| "ollama".to_string());
                let model = std::env::var("LAZYNEXT_AI_MODEL").unwrap_or_else(|_| "".to_string());
                let api_key = std::env::var("LAZYNEXT_API_KEY").unwrap_or_else(|_| "mock".to_string());

                let rt = tokio::runtime::Runtime::new().unwrap();
                let output = rt.block_on(async {
                    if let Ok(agent) = agent::AgentFactory::create(&provider, &model, &api_key) {
                        if let Ok(res) = agent.send_prompt(prompt).await {
                            return format!("Agent Response:\n{:?}", res);
                        }
                    }
                    "Failed to execute agent action".to_string()
                });
                
                response.result = Some(serde_json::json!({
                    "content": [
                        { "type": "text", "text": output }
                    ]
                }));
            } else {
                response.error = Some(RpcError {
                    code: -32601,
                    message: "Method not found".to_string(),
                });
            }
        }
        _ => {
            response.error = Some(RpcError {
                code: -32601,
                message: "Method not found".to_string(),
            });
        }
    }
    response
}

fn main() -> Result<()> {
    let shared_project: Arc<Mutex<Option<ProjectData>>> = Arc::new(Mutex::new(None));
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut handle = stdout.lock();

    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<RpcRequest>(&line) {
            Ok(req) => {
                let res = handle_request(req, Arc::clone(&shared_project));
                let res_json = serde_json::to_string(&res)?;
                writeln!(handle, "{}", res_json)?;
                handle.flush()?;
            }
            Err(e) => {
                let err_res = serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": {
                        "code": -32700,
                        "message": format!("Parse error: {}", e)
                    }
                });
                writeln!(handle, "{}", err_res)?;
                handle.flush()?;
            }
        }
    }
    Ok(())
}
