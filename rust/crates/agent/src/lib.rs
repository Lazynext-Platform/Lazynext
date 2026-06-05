pub mod tools;

use anyhow::{Result, Context, anyhow};
use reqwest::Client;
use serde_json::json;
use async_trait::async_trait;

pub enum AgentResponse {
    Text(String),
    ToolCall { name: String, input: serde_json::Value },
    Multiple(Vec<AgentResponse>),
}

#[async_trait]
pub trait AgentProvider: Send + Sync {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse>;
}

// -----------------------------------------------------------------------------
// Anthropic (Claude) Implementation
// -----------------------------------------------------------------------------

pub struct ClaudeAgent {
    client: Client,
    api_key: String,
    model: String,
}

impl ClaudeAgent {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }
}

#[async_trait]
impl AgentProvider for ClaudeAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let tools = tools::get_available_tools();
        
        let payload = json!({
            "model": self.model,
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

// -----------------------------------------------------------------------------
// OpenAI Implementation
// -----------------------------------------------------------------------------

pub struct OpenAIAgent {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenAIAgent {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }

    fn convert_to_openai_tools(anthropic_tools: Vec<tools::Tool>) -> serde_json::Value {
        let mut oai_tools = vec![];
        for t in anthropic_tools {
            oai_tools.push(json!({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema
                }
            }));
        }
        json!(oai_tools)
    }
}

#[async_trait]
impl AgentProvider for OpenAIAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let tools = Self::convert_to_openai_tools(tools::get_available_tools());
        
        let payload = json!({
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are Lazynext Agent, an autonomous video editor. You have direct control over a Rust-based NLE. When the user asks you to edit their video, use your available tools to perform the edit."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "tools": tools,
            "tool_choice": "auto"
        });

        let res = self.client.post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .header("content-type", "application/json")
            .json(&payload)
            .send()
            .await
            .context("Failed to send request to OpenAI")?;

        let body: serde_json::Value = res.json().await.context("Failed to parse response JSON")?;
        
        if let Some(choices) = body["choices"].as_array() {
            if let Some(message) = choices.get(0).and_then(|c| c.get("message")) {
                let mut responses = vec![];
                
                if let Some(text) = message["content"].as_str() {
                    if !text.is_empty() {
                        responses.push(AgentResponse::Text(text.to_string()));
                    }
                }
                
                if let Some(tool_calls) = message["tool_calls"].as_array() {
                    for tc in tool_calls {
                        if tc["type"] == "function" {
                            let func = &tc["function"];
                            let name = func["name"].as_str().unwrap_or("unknown").to_string();
                            let arguments_str = func["arguments"].as_str().unwrap_or("{}");
                            let input: serde_json::Value = serde_json::from_str(arguments_str)
                                .unwrap_or_else(|_| json!({}));
                            
                            responses.push(AgentResponse::ToolCall { name, input });
                        }
                    }
                }
                
                return Ok(AgentResponse::Multiple(responses));
            }
        }
        
        Ok(AgentResponse::Text(format!("Error: Unexpected OpenAI response format: {}", body)))
    }
}

// -----------------------------------------------------------------------------
// Gemini Implementation
// -----------------------------------------------------------------------------

pub struct GeminiAgent {
    client: Client,
    api_key: String,
    model: String,
}

impl GeminiAgent {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }

    fn convert_to_gemini_tools(anthropic_tools: Vec<tools::Tool>) -> serde_json::Value {
        let mut declarations = vec![];
        for t in anthropic_tools {
            declarations.push(json!({
                "name": t.name,
                "description": t.description,
                "parameters": t.input_schema
            }));
        }
        json!([{ "functionDeclarations": declarations }])
    }
}

#[async_trait]
impl AgentProvider for GeminiAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let tools = Self::convert_to_gemini_tools(tools::get_available_tools());
        
        let payload = json!({
            "systemInstruction": {
                "parts": [{ "text": "You are Lazynext Agent, an autonomous video editor. You have direct control over a Rust-based NLE. When the user asks you to edit their video, use your available tools to perform the edit." }]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{ "text": prompt }]
                }
            ],
            "tools": tools
        });

        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", self.model, self.api_key);
        let res = self.client.post(&url)
            .header("content-type", "application/json")
            .json(&payload)
            .send()
            .await
            .context("Failed to send request to Gemini")?;

        let body: serde_json::Value = res.json().await.context("Failed to parse response JSON")?;
        
        if let Some(candidates) = body["candidates"].as_array() {
            if let Some(content) = candidates.get(0).and_then(|c| c.get("content")) {
                if let Some(parts) = content["parts"].as_array() {
                    let mut responses = vec![];
                    
                    for part in parts {
                        if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                            if !text.is_empty() {
                                responses.push(AgentResponse::Text(text.to_string()));
                            }
                        }
                        
                        if let Some(func_call) = part.get("functionCall") {
                            let name = func_call["name"].as_str().unwrap_or("unknown").to_string();
                            let input = func_call["args"].clone();
                            responses.push(AgentResponse::ToolCall { name, input });
                        }
                    }
                    
                    return Ok(AgentResponse::Multiple(responses));
                }
            }
        }
        
        Ok(AgentResponse::Text(format!("Error: Unexpected Gemini response format: {}", body)))
    }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

pub struct AgentFactory;

impl AgentFactory {
    pub fn create(provider: &str, model: &str, api_key: &str) -> Result<Box<dyn AgentProvider>> {
        match provider.to_lowercase().as_str() {
            "anthropic" | "claude" => {
                let m = if model.is_empty() { "claude-3-5-sonnet-20241022" } else { model };
                Ok(Box::new(ClaudeAgent::new(api_key.to_string(), m.to_string())))
            }
            "openai" | "gpt" => {
                let m = if model.is_empty() { "gpt-4o" } else { model };
                Ok(Box::new(OpenAIAgent::new(api_key.to_string(), m.to_string())))
            }
            "gemini" | "google" => {
                let m = if model.is_empty() { "gemini-1.5-pro" } else { model };
                Ok(Box::new(GeminiAgent::new(api_key.to_string(), m.to_string())))
            }
            _ => Err(anyhow!("Unsupported provider: {}. Try 'anthropic', 'openai', or 'gemini'.", provider)),
        }
    }
}
