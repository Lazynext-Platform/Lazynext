use lazynext_core::nle_state::NLEState;
use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use std::io::{self, BufRead};
use serde_json::{json, Value};

#[tokio::main]
async fn main() {
    let editor = AutonomousEditor::new();
    
    eprintln!("Lazynext MCP Server started.");
    eprintln!("Exposing tool: autonomous_edit");
    
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let req_str = line.unwrap_or_default();
        if req_str.is_empty() { continue; }
        
        // Basic JSON-RPC handling
        if let Ok(req) = serde_json::from_str::<Value>(&req_str) {
            let id = req["id"].clone();
            let method = req["method"].as_str().unwrap_or("");
            
            if method == "call_tool" {
                if req["params"]["name"] == "autonomous_edit" {
                    let prompt = req["params"]["arguments"]["prompt"].as_str().unwrap_or("").to_string();
                    let intent = VideoIntent {
                        prompt,
                        require_plan_approval: true,
                        source_files: vec![],
                    };
                    
                    let job_id = editor.process_intent(intent).await.unwrap_or_else(|e| e);
                    
                    let response = json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "job_id": job_id,
                            "status": "awaiting_approval"
                        }
                    });
                    println!("{}", response);
                    continue;
                }
            }
            
            let response = json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": "Acknowledged"
            });
            println!("{}", response);
        }
    }
}
