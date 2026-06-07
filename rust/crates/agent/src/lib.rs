pub mod tools;
pub mod executor;

use anyhow::{Result, Context, anyhow};
use reqwest::Client;
use serde_json::json;
use async_trait::async_trait;

#[derive(Debug)]
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
                } else if block["type"] == "text"
                    && let Some(text) = block["text"].as_str() {
                        responses.push(AgentResponse::Text(text.to_string()));
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
        
        if let Some(choices) = body["choices"].as_array()
            && let Some(message) = choices.first().and_then(|c| c.get("message")) {
                let mut responses = vec![];
                
                if let Some(text) = message["content"].as_str()
                    && !text.is_empty() {
                        responses.push(AgentResponse::Text(text.to_string()));
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
        
        if let Some(candidates) = body["candidates"].as_array()
            && let Some(content) = candidates.first().and_then(|c| c.get("content"))
                && let Some(parts) = content["parts"].as_array() {
                    let mut responses = vec![];
                    
                    for part in parts {
                        if let Some(text) = part.get("text").and_then(|t| t.as_str())
                            && !text.is_empty() {
                                responses.push(AgentResponse::Text(text.to_string()));
                            }
                        
                        if let Some(func_call) = part.get("functionCall") {
                            let name = func_call["name"].as_str().unwrap_or("unknown").to_string();
                            let input = func_call["args"].clone();
                            responses.push(AgentResponse::ToolCall { name, input });
                        }
                    }
                    
                    return Ok(AgentResponse::Multiple(responses));
                }
        
        Ok(AgentResponse::Text(format!("Error: Unexpected Gemini response format: {}", body)))
    }
}

// -----------------------------------------------------------------------------
// Ollama Implementation (Local Models)
// -----------------------------------------------------------------------------

pub struct OllamaAgent {
    client: Client,
    model: String,
    endpoint: String,
}

impl OllamaAgent {
    pub fn new(model: String, endpoint: String) -> Self {
        let ep = if endpoint.is_empty() { "http://localhost:11434".to_string() } else { endpoint };
        Self {
            client: Client::new(),
            model,
            endpoint: ep,
        }
    }

    fn convert_to_ollama_tools(anthropic_tools: Vec<tools::Tool>) -> serde_json::Value {
        // Ollama uses OpenAI's exact function calling schema!
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
impl AgentProvider for OllamaAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let tools = Self::convert_to_ollama_tools(tools::get_available_tools());
        
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
            "stream": false
        });

        let url = format!("{}/api/chat", self.endpoint);
        let res = self.client.post(&url)
            .header("content-type", "application/json")
            .json(&payload)
            .send()
            .await
            .context("Failed to send request to Ollama")?;

        let body: serde_json::Value = res.json().await.context("Failed to parse response JSON")?;
        
        if let Some(message) = body.get("message") {
            let mut responses = vec![];
            
            if let Some(text) = message["content"].as_str()
                && !text.is_empty() {
                    responses.push(AgentResponse::Text(text.to_string()));
                }
            
            if let Some(tool_calls) = message["tool_calls"].as_array() {
                for tc in tool_calls {
                    if let Some(func) = tc.get("function") {
                        let name = func["name"].as_str().unwrap_or("unknown").to_string();
                        let input = func["arguments"].clone();
                        responses.push(AgentResponse::ToolCall { name, input });
                    }
                }
            }
            
            return Ok(AgentResponse::Multiple(responses));
        }
        
        Ok(AgentResponse::Text(format!("Error: Unexpected Ollama response format: {}", body)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_factory_openai() {
        let agent = AgentFactory::create("openai", "gpt-4o", "mock_key");
        assert!(agent.is_ok());
    }

    #[test]
    fn test_agent_factory_anthropic() {
        let agent = AgentFactory::create("anthropic", "claude-3", "mock_key");
        assert!(agent.is_ok());
    }

    #[test]
    fn test_agent_factory_gemini() {
        let agent = AgentFactory::create("gemini", "gemini-1.5-pro", "mock_key");
        assert!(agent.is_ok());
    }

    #[test]
    fn test_agent_factory_ollama() {
        let agent = AgentFactory::create("ollama", "llama3", "http://localhost:11434");
        assert!(agent.is_ok());
    }

    #[test]
    fn test_agent_factory_invalid() {
        let agent = AgentFactory::create("invalid_provider", "model", "mock_key");
        assert!(agent.is_err());
    }

    #[tokio::test]
    async fn test_agent_response_debug() {
        let res = AgentResponse::Text("Success".into());
        let dbg = format!("{:?}", res);
        assert_eq!(dbg, "Text(\"Success\")");
    }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// OpenAI-Compatible Generic Agent (Mistral, Groq, DeepSeek, Together, etc.)
// -----------------------------------------------------------------------------

pub struct OpenAICompatibleAgent {
    client: Client,
    api_key: String,
    model: String,
    base_url: String,
}

impl OpenAICompatibleAgent {
    pub fn new(api_key: String, model: String, base_url: String) -> Self {
        Self { client: Client::new(), api_key, model, base_url }
    }
}

#[async_trait]
impl AgentProvider for OpenAICompatibleAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let tools = OpenAIAgent::convert_to_openai_tools(tools::get_available_tools());
        let payload = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are Lazynext Agent, an autonomous video editor."},
                {"role": "user", "content": prompt}
            ],
            "tools": tools, "tool_choice": "auto"
        });
        let res = self.client.post(&self.base_url).bearer_auth(&self.api_key)
            .header("content-type", "application/json").json(&payload).send().await
            .context("OpenAI-compatible request failed")?;
        let body: serde_json::Value = res.json().await?;
        if let Some(choices) = body["choices"].as_array()
            && let Some(msg) = choices.first().and_then(|c| c.get("message")) {
                let mut responses = vec![];
                if let Some(t) = msg["content"].as_str() { if !t.is_empty() { responses.push(AgentResponse::Text(t.into())); } }
                if let Some(tcs) = msg["tool_calls"].as_array() {
                    for tc in tcs {
                        if let Some(f) = tc.get("function") {
                            responses.push(AgentResponse::ToolCall {
                                name: f["name"].as_str().unwrap_or("unknown").into(),
                                input: serde_json::from_str(f["arguments"].as_str().unwrap_or("{}")).unwrap_or(json!({})),
                            });
                        }
                    }
                }
                return Ok(AgentResponse::Multiple(responses));
            }
        Ok(AgentResponse::Text(format!("{}", body)))
    }
}

macro_rules! openai_compat_agent {
    ($name:ident, $url:expr) => {
        pub struct $name(OpenAICompatibleAgent);
        impl $name { pub fn new(api_key: String, model: String) -> Self { Self(OpenAICompatibleAgent::new(api_key, model, $url.into())) } }
        #[async_trait] impl AgentProvider for $name { async fn send_prompt(&self, p: &str) -> Result<AgentResponse> { self.0.send_prompt(p).await } }
    };
}

openai_compat_agent!(MistralAgent, "https://api.mistral.ai/v1/chat/completions");
openai_compat_agent!(GroqAgent, "https://api.groq.com/openai/v1/chat/completions");
openai_compat_agent!(DeepSeekAgent, "https://api.deepseek.com/v1/chat/completions");
openai_compat_agent!(XAIAgent, "https://api.x.ai/v1/chat/completions");
openai_compat_agent!(TogetherAgent, "https://api.together.xyz/v1/chat/completions");
openai_compat_agent!(PerplexityAgent, "https://api.perplexity.ai/chat/completions");
openai_compat_agent!(FireworksAgent, "https://api.fireworks.ai/inference/v1/chat/completions");
openai_compat_agent!(AnyScaleAgent, "https://api.endpoints.anyscale.com/v1/chat/completions");

// -----------------------------------------------------------------------------
// Cohere (native API)
// -----------------------------------------------------------------------------
pub struct CohereAgent { client: Client, api_key: String, model: String }
impl CohereAgent { pub fn new(api_key: String, model: String) -> Self { Self { client: Client::new(), api_key, model } } }
#[async_trait]
impl AgentProvider for CohereAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let tools = tools::get_available_tools();
        let ct: Vec<serde_json::Value> = tools.iter().map(|t| json!({"name":t.name,"description":t.description,"parameter_definitions":t.input_schema.get("properties")})).collect();
        let res = self.client.post("https://api.cohere.com/v2/chat").bearer_auth(&self.api_key)
            .json(&json!({"model":self.model,"message":prompt,"preamble":"You are Lazynext Agent.","tools":ct})).send().await?;
        let body: serde_json::Value = res.json().await?;
        if let Some(t) = body["text"].as_str() { return Ok(AgentResponse::Text(t.into())); }
        Ok(AgentResponse::Text(format!("Cohere: {}", body)))
    }
}

// -----------------------------------------------------------------------------
// Replicate
// -----------------------------------------------------------------------------
pub struct ReplicateAgent { client: Client, api_key: String, model: String }
impl ReplicateAgent { pub fn new(api_key: String, model: String) -> Self { Self { client: Client::new(), api_key, model: models::resolve_replicate(&model) } } }
#[async_trait]
impl AgentProvider for ReplicateAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let res = self.client.post("https://api.replicate.com/v1/predictions").bearer_auth(&self.api_key)
            .json(&json!({"version":self.model,"input":{"prompt":prompt,"max_tokens":1024}})).send().await?;
        let body: serde_json::Value = res.json().await?;
        if let Some(o) = body["output"].as_str() { return Ok(AgentResponse::Text(o.into())); }
        Ok(AgentResponse::Text("Prediction queued".into()))
    }
}

// -----------------------------------------------------------------------------
// Hugging Face
// -----------------------------------------------------------------------------
pub struct HuggingFaceAgent { client: Client, api_key: String, model: String }
impl HuggingFaceAgent { pub fn new(api_key: String, model: String) -> Self { Self { client: Client::new(), api_key, model } } }
#[async_trait]
impl AgentProvider for HuggingFaceAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let url = format!("https://api-inference.huggingface.co/models/{}", self.model);
        let res = self.client.post(&url).bearer_auth(&self.api_key)
            .json(&json!({"inputs":prompt,"parameters":{"max_new_tokens":1024}})).send().await?;
        let body: serde_json::Value = res.json().await?;
        if let Some(arr) = body.as_array().and_then(|a| a.first()) {
            if let Some(t) = arr["generated_text"].as_str() { return Ok(AgentResponse::Text(t.into())); }
        }
        Ok(AgentResponse::Text(format!("HF: {}", body)))
    }
}

// -----------------------------------------------------------------------------
// Cloudflare Workers AI
// -----------------------------------------------------------------------------
pub struct CloudflareAgent { client: Client, api_key: String, account_id: String, model: String }
impl CloudflareAgent { pub fn new(api_key: String, account_id: String, model: String) -> Self { Self { client: Client::new(), api_key, account_id, model } } }
#[async_trait]
impl AgentProvider for CloudflareAgent {
    async fn send_prompt(&self, prompt: &str) -> Result<AgentResponse> {
        let url = format!("https://api.cloudflare.com/client/v4/accounts/{}/ai/run/{}", self.account_id, self.model);
        let res = self.client.post(&url).bearer_auth(&self.api_key)
            .json(&json!({"messages":[{"role":"user","content":prompt}],"max_tokens":1024})).send().await?;
        let body: serde_json::Value = res.json().await?;
        if let Some(r) = body["result"]["response"].as_str() { return Ok(AgentResponse::Text(r.into())); }
        Ok(AgentResponse::Text(format!("CF: {}", body)))
    }
}

// -----------------------------------------------------------------------------
// Model Defaults
// -----------------------------------------------------------------------------
pub mod models {
    pub fn default_model(provider: &str) -> &str {
        match provider {
            "anthropic"|"claude" => "claude-sonnet-4-20250514",
            "openai"|"gpt" => "gpt-4o",
            "gemini"|"google" => "gemini-2.0-flash",
            "ollama"|"local" => "llama3.2",
            "mistral" => "mistral-large-latest",
            "groq" => "llama-3.3-70b-versatile",
            "deepseek" => "deepseek-chat",
            "xai"|"grok" => "grok-2-1212",
            "together" => "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            "perplexity" => "llama-3.1-sonar-large-128k-online",
            "fireworks" => "accounts/fireworks/models/llama-v3p3-70b-instruct",
            "anyscale" => "meta-llama/Llama-3.3-70B-Instruct",
            "cohere" => "command-r-plus",
            "replicate" => "meta/meta-llama-3-70b-instruct",
            "huggingface"|"hf" => "mistralai/Mistral-7B-Instruct-v0.3",
            "cloudflare"|"cf" => "@cf/meta/llama-3.3-70b-instruct",
            _ => "llama3.2",
        }
    }
    pub fn resolve_replicate(m: &str) -> String { if m.contains('/') { m.into() } else { "meta/meta-llama-3-70b-instruct".into() } }
}

// -----------------------------------------------------------------------------
// Factory — 18+ Providers
// -----------------------------------------------------------------------------
pub struct AgentFactory;
impl AgentFactory {
    pub fn create(provider: &str, model: &str, api_key: &str) -> Result<Box<dyn AgentProvider>> {
        let m = if model.is_empty() { models::default_model(provider) } else { model };
        let k = api_key.to_string();
        match provider.to_lowercase().as_str() {
            "anthropic"|"claude" => Ok(Box::new(ClaudeAgent::new(k, m.into()))),
            "openai"|"gpt" => Ok(Box::new(OpenAIAgent::new(k, m.into()))),
            "gemini"|"google" => Ok(Box::new(GeminiAgent::new(k, m.into()))),
            "ollama"|"local" => Ok(Box::new(OllamaAgent::new(m.into(), k))),
            "mistral" => Ok(Box::new(MistralAgent::new(k, m.into()))),
            "groq" => Ok(Box::new(GroqAgent::new(k, m.into()))),
            "deepseek" => Ok(Box::new(DeepSeekAgent::new(k, m.into()))),
            "xai"|"grok" => Ok(Box::new(XAIAgent::new(k, m.into()))),
            "together" => Ok(Box::new(TogetherAgent::new(k, m.into()))),
            "perplexity" => Ok(Box::new(PerplexityAgent::new(k, m.into()))),
            "fireworks" => Ok(Box::new(FireworksAgent::new(k, m.into()))),
            "anyscale" => Ok(Box::new(AnyScaleAgent::new(k, m.into()))),
            "cohere" => Ok(Box::new(CohereAgent::new(k, m.into()))),
            "replicate" => Ok(Box::new(ReplicateAgent::new(k, m.into()))),
            "huggingface"|"hf" => Ok(Box::new(HuggingFaceAgent::new(k, m.into()))),
            "cloudflare"|"cf" => Ok(Box::new(CloudflareAgent::new(k, "lazynext".into(), m.into()))),
            _ => Err(anyhow!("Unsupported: '{}'. Available (18): anthropic, openai, gemini, ollama, mistral, groq, deepseek, xai, together, perplexity, fireworks, anyscale, cohere, replicate, huggingface, cloudflare", provider)),
        }
    }
}
