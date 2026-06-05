pub mod tools;

use anyhow::{Result, Context};
use reqwest::Client;
use serde_json::json;

pub enum AgentResponse {
    Text(String),
    ToolCall { name: String, input: serde_json::Value },
    Multiple(Vec<AgentResponse>),
}

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

    pub async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
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
        
        if let Some(content) = body["content"].as_array() {
            let mut responses = vec![];
            for block in content {
                if block["type"] == "tool_use" {
                    responses.push(AgentResponse::ToolCall {
                        name: block["name"].as_str().unwrap_or("unknown").to_string(),
                        input: block["input"].clone()
                    });
                } else if block["type"] == "text" {
                    if let Some(text) = block["text"].as_str() {
                        responses.push(AgentResponse::Text(text.to_string()));
                    }
                }
            }
            Ok(AgentResponse::Multiple(responses))
        } else {
            Ok(AgentResponse::Text(format!("Error: Unexpected response format: {}", body)))
        }
    }
}
