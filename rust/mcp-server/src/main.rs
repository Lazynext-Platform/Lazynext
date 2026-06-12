use lazynext_core::nle_state::NLEState;
use std::io::{self, BufRead};

#[tokio::main]
async fn main() {
    // Initialize the core engine
    let engine_state = NLEState::new("mcp_session_1".to_string(), "AI Editor".to_string(), 24);
    
    // In a real MCP server, this would communicate via JSON-RPC over stdio
    eprintln!("Lazynext MCP Server started.");
    eprintln!("AI assistants can now access the timeline with {} tracks.", engine_state.get_project_data().tracks.len());
    
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let req = line.unwrap_or_default();
        if req.is_empty() { continue; }
        
        // Simple echo for now, to be replaced by full MCP protocol parser
        println!("{{\"jsonrpc\": \"2.0\", \"result\": \"Acknowledged command by AI\"}}");
    }
}
