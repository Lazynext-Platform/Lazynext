pub mod tools;

use anyhow::{Result, Context};
use reqwest::Client;
use serde_json::json;

pub struct ClaudeAgent {
    client: Client,
    api_key: String,
}

impl ClaudeAgent {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn send_prompt(&self, prompt: &str) -> Result<String> {
        let tools = tools::get_available_tools();
        
        let payload = json!({
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "system": "You are Lazynext Agent, an autonomous video editor. You have direct control over a Rust-based NLE. When the user asks you to edit their video, use your available tools to perform the edit.",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "tools": tools
        });

        let res = self.client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&payload)
            .send()
            .await
            .context("Failed to send request to Anthropic")?;

        let body: serde_json::Value = res.json().await.context("Failed to parse response JSON")?;
        
        // Extract the text response or tool calls
        if let Some(content) = body["content"].as_array() {
            let mut output = String::new();
            for block in content {
                if block["type"] == "tool_use" {
                    let tool_name = block["name"].as_str().unwrap_or("unknown");
                    let tool_input = &block["input"];
                    output.push_str(&format!("\n[AGENT TRIGGERED TOOL: {} with input: {}]", tool_name, tool_input));
                } else if block["type"] == "text" {
                    if let Some(text) = block["text"].as_str() {
                        output.push_str(&format!("\n[AGENT MESSAGE: {}]", text));
                    }
                }
            }
            Ok(output)
        } else {
            Ok(format!("Error: Unexpected response format: {}", body))
        }
    }
}
