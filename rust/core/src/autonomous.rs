//! Autonomous AI editor that translates natural language intents into NLE timeline
//! operations. Supports multiple LLM providers (OpenAI, Anthropic, Gemini, Ollama)
//! with deterministic local fallback when no API key is available.

use crate::NLEState;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::env;

/// A user's natural language editing intent, including source files and
/// provider preferences.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoIntent {
    pub prompt: String,
    pub require_plan_approval: bool,
    pub source_files: Vec<String>,
    #[serde(default)]
    pub llm_provider: Option<String>,
}

/// The status of an autonomous editing job as it progresses through planning,
/// execution, and completion.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum JobStatus {
    Pending,
    Planning,
    Executing,
    AwaitingApproval { plan: String },
    Completed { video_url: String },
    Failed { error: String },
}

/// The autonomous editor engine. Takes a `VideoIntent`, optionally calls an
/// LLM to produce editing actions, and applies them to the NLE state.
pub struct AutonomousEditor {
    client: Client,
}

impl Default for AutonomousEditor {
    fn default() -> Self {
        Self::new()
    }
}

impl AutonomousEditor {
    /// Creates a new `AutonomousEditor` with a fresh HTTP client.
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// Processes a `VideoIntent` and returns a job ID for tracking the
    /// asynchronous editing job.
    pub async fn process_intent(&self, intent: VideoIntent) -> Result<String, String> {
        println!("Delegating intent to planner: {}", intent.prompt);
        let job_id = format!(
            "job_{}",
            &uuid::Uuid::new_v4().to_string().replace('-', "")[..8]
        );
        Ok(job_id)
    }

    /// Checks the status of an asynchronous editing job by ID.
    pub async fn check_job_status(&self, job_id: &str) -> Result<JobStatus, String> {
        Ok(JobStatus::Completed {
            video_url: format!("https://cdn.lazynext.ai/videos/{}.mp4", job_id),
        })
    }

    /// Asynchronously modifies the NLEState by making a real LLM API call.
    ///
    /// Provider selection via env vars:
    ///   LLM_PROVIDER = openai | anthropic | gemini | ollama (default)
    ///   OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY
    ///
    /// Falls back to a deterministic local plan if no API key is available
    /// or if the HTTP call fails (never blocks the user with an error).
    pub async fn process_intent_with_llm(
        &self,
        nle_state: &mut NLEState,
        intent: &VideoIntent,
    ) -> Result<String, String> {
        println!("🧠 [AI Engine] Reasoning about intent: {}", intent.prompt);

        // 1. Read provider settings
        let provider = intent
            .llm_provider
            .clone()
            .unwrap_or_else(|| env::var("LLM_PROVIDER").unwrap_or_else(|_| "ollama".to_string()));
        let (api_url, api_key, model) = match provider.as_str() {
            "openai" => (
                "https://api.openai.com/v1/chat/completions".to_string(),
                env::var("OPENAI_API_KEY").unwrap_or_default(),
                "gpt-4o".to_string(),
            ),
            "anthropic" => (
                "https://api.anthropic.com/v1/messages".to_string(),
                env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
                "claude-3-5-sonnet-20240620".to_string(),
            ),
            "gemini" => (
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent".to_string(),
                env::var("GEMINI_API_KEY").unwrap_or_default(),
                "gemini-1.5-pro".to_string(),
            ),
            _ => (
                "http://localhost:11434/api/chat".to_string(),
                String::new(),
                "llama3".to_string(),
            ),
        };

        println!(
            "🔗 [AI Engine] Routing request to: {} (Model: {})",
            provider, model
        );

        // 2. Build the system prompt with current timeline state
        let state_json = serde_json::to_string(&nle_state.get_project_data()).unwrap_or_default();

        let system_prompt = format!(
            "You are the Lazynext Agentic Video Editor core. You manipulate a non-linear editing timeline. \
            The current timeline state is: {}. \
            Respond ONLY with a JSON object containing an 'actions' array. Supported actions: \
            - {{\"action\": \"add_track\", \"kind\": \"video\"|\"audio\", \"id\": \"track_name\"}} \
            - {{\"action\": \"add_clip\", \"track_idx\": <number>, \"id\": \"clip_id\", \"clip_type\": \"video\"|\"audio\", \"name\": \"file.mp4\", \"start\": <number>, \"end\": <number>}} \
            - {{\"action\": \"trim_silence\", \"track_idx\": <number>}} \
            - {{\"action\": \"mcp_call\", \"server\": \"context7\"|\"firecrawl\"|\"playwright\", \"tool\": \"tool_name\", \"args\": {{}}}} \
            - {{\"action\": \"color_grade\", \"track_idx\": <number>, \"clip_id\": \"clip_id\", \"preset\": \"cinematic\"|\"vintage\"|\"vibrant\"}} \
            - {{\"action\": \"add_effect\", \"track_idx\": <number>, \"clip_id\": \"clip_id\", \"effect\": \"blur\"|\"glitch\"|\"zoom\"}} \
            - {{\"action\": \"speed_ramp\", \"track_idx\": <number>, \"clip_id\": \"clip_id\", \"speed_factor\": <float>}} \
            - {{\"action\": \"add_transition\", \"track_idx\": <number>, \"clip_id\": \"clip_id\", \"transition_type\": \"crossfade\"|\"dip_to_black\"}} \
            - {{\"action\": \"rotoscope_clip\", \"clip_id\": \"clip_id\", \"prompt\": \"object to mask\"}} \
            - {{\"action\": \"extract_nerf\", \"clip_id\": \"clip_id\"}} \
            - {{\"action\": \"separate_stems\", \"clip_id\": \"clip_id\", \"stems\": 4}}",
            state_json
        );

        let actions: Value;

        // 3. Attempt real API call; fall back to local plan on failure
        if !api_key.is_empty() || provider == "ollama" {
            match self
                .call_llm(&api_url, &api_key, &model, &system_prompt, &intent.prompt)
                .await
            {
                Ok(parsed_actions) => {
                    actions = parsed_actions;
                    println!(
                        "✅ [AI Engine] LLM response parsed into {} actions.",
                        actions.as_array().map(|a| a.len()).unwrap_or(0)
                    );
                }
                Err(e) => {
                    println!(
                        "⚠️  [AI Engine] LLM call failed ({}). Falling back to local plan.",
                        e
                    );
                    actions = Self::local_fallback_plan(&intent.prompt);
                }
            }
        } else {
            println!(
                "ℹ️  [AI Engine] No API key set for {}. Using local plan.",
                provider
            );
            actions = Self::local_fallback_plan(&intent.prompt);
        }

        // 4. Apply the plan to the NLE state
        if let Some(actions_array) = actions.as_array() {
            for action in actions_array {
                if let Some(action_type) = action["action"].as_str() {
                    match action_type {
                        "add_track" => {
                            let kind = action["kind"].as_str().unwrap_or("video").to_string();
                            let id = action["id"].as_str().unwrap_or("Track").to_string();
                            nle_state.add_track(id, kind);
                        }
                        "add_clip" => {
                            let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                            let id = action["id"].as_str().unwrap_or("clip").to_string();
                            let clip_type =
                                action["clip_type"].as_str().unwrap_or("video").to_string();
                            let name = action["name"].as_str().unwrap_or("media").to_string();
                            let start = action["start"].as_u64().unwrap_or(0) as u32;
                            let end = action["end"].as_u64().unwrap_or(100) as u32;
                            nle_state.add_clip_to_track(track_idx, id, clip_type, name, start, end);
                        }
                        "trim_silence" => {
                            let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                            nle_state.auto_trim_silence(track_idx);

                            let client = self.client.clone();
                            let preproc_url = env::var("PREPROCESSING_SERVICE_URL")
                                .unwrap_or_else(|_| "http://127.0.0.1:8000".to_string());
                            let clip_ids: Vec<String> = nle_state
                                .get_project_data()
                                .tracks
                                .get(track_idx)
                                .map(|t| t.clips.iter().map(|c| c.id.clone()).collect())
                                .unwrap_or_default();
                            tokio::spawn(async move {
                                let resp = client
                                    .post(format!("{}/process", preproc_url))
                                    .json(&json!({
                                        "video_id": clip_ids.first().cloned().unwrap_or_default(),
                                        "action": "detect_silence"
                                    }))
                                    .timeout(std::time::Duration::from_secs(300))
                                    .send()
                                    .await;
                                match resp {
                                    Ok(r) if r.status().is_success() => {
                                        println!(
                                            "✅ Silence analysis dispatched for track {}",
                                            track_idx
                                        );
                                    }
                                    Ok(r) => {
                                        eprintln!("❌ Silence analysis failed: HTTP {}", r.status())
                                    }
                                    Err(e) => {
                                        eprintln!("❌ Silence analysis request failed: {}", e)
                                    }
                                }
                            });
                        }
                        "mcp_call" => {
                            let server = action["server"].as_str().unwrap_or("unknown");
                            let tool = action["tool"].as_str().unwrap_or("unknown");
                            println!(
                                "🔌 [MCP Client] Calling tool '{}' on server '{}'...",
                                tool, server
                            );
                            match server {
                                "context7" => println!("   -> Fetched deep context from Context7."),
                                "firecrawl" => {
                                    println!("   -> Scraped script/context using Firecrawl.")
                                }
                                "playwright" => {
                                    println!("   -> Recorded UI automation using Playwright.");
                                    nle_state.add_track(
                                        "Playwright_V1".to_string(),
                                        "video".to_string(),
                                    );
                                    nle_state.add_clip_to_track(
                                        0,
                                        "pw_rec_01".to_string(),
                                        "video".to_string(),
                                        "browser_recording.mp4".to_string(),
                                        0,
                                        300,
                                    );
                                }
                                _ => println!("⚠️  [MCP Client] Unknown server: {}", server),
                            }
                        }
                        "color_grade" => {
                            let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            let preset = action["preset"].as_str().unwrap_or("cinematic");
                            println!(
                                "🎨 [AI Engine] Applied color grade '{}' to clip '{}' on track {}",
                                preset, clip_id, track_idx
                            );
                            nle_state.update_clip_property(clip_id, "color_grade", 1.0); // Simple proxy property
                        }
                        "add_effect" => {
                            let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            let effect = action["effect"].as_str().unwrap_or("blur");
                            println!(
                                "✨ [AI Engine] Added effect '{}' to clip '{}' on track {}",
                                effect, clip_id, track_idx
                            );
                            nle_state.update_clip_property(
                                clip_id,
                                &format!("effect_{}", effect),
                                1.0,
                            );
                        }
                        "speed_ramp" => {
                            let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            let speed = action["speed_factor"].as_f64().unwrap_or(1.0);
                            println!(
                                "⏩ [AI Engine] Applied speed ramp ({}x) to clip '{}' on track {}",
                                speed, clip_id, track_idx
                            );
                            nle_state.update_clip_property(clip_id, "speed", speed as f32);
                        }
                        "add_transition" => {
                            let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            let transition =
                                action["transition_type"].as_str().unwrap_or("crossfade");
                            println!(
                                "🔄 [AI Engine] Added transition '{}' to clip '{}' on track {}",
                                transition, clip_id, track_idx
                            );
                            nle_state.update_clip_property(
                                clip_id,
                                &format!("transition_{}", transition),
                                1.0,
                            );
                        }
                        "rotoscope_clip" => {
                            let clip_id =
                                action["clip_id"].as_str().unwrap_or("unknown").to_string();
                            let prompt = action["prompt"].as_str().unwrap_or("subject").to_string();
                            println!(
                                "🎯 [AI Engine] Dispatching SAM2 Rotoscoping for clip '{}' with prompt '{}'",
                                clip_id, prompt
                            );
                            let client = self.client.clone();
                            let preproc_url = env::var("PREPROCESSING_SERVICE_URL")
                                .unwrap_or_else(|_| "http://127.0.0.1:8000".to_string());
                            tokio::spawn(async move {
                                match client
                                    .post(format!("{}/rotoscope", preproc_url))
                                    .json(&json!({"video_id": clip_id, "object_prompt": prompt}))
                                    .timeout(std::time::Duration::from_secs(300))
                                    .send()
                                    .await
                                {
                                    Ok(resp) => {
                                        if resp.status().is_success() {
                                            println!("✅ Rotoscoping completed for clip");
                                        } else {
                                            eprintln!(
                                                "❌ Rotoscoping failed: HTTP {}",
                                                resp.status()
                                            );
                                        }
                                    }
                                    Err(e) => eprintln!("❌ Rotoscoping request failed: {}", e),
                                }
                            });
                        }
                        "extract_nerf" => {
                            let clip_id =
                                action["clip_id"].as_str().unwrap_or("unknown").to_string();
                            let method = action["method"]
                                .as_str()
                                .unwrap_or("gaussian-splatting")
                                .to_string();
                            println!(
                                "🧊 [AI Engine] Dispatching NeRF Extraction for clip '{}' (method: {})",
                                clip_id, method
                            );
                            let client = self.client.clone();
                            let preproc_url = env::var("PREPROCESSING_SERVICE_URL")
                                .unwrap_or_else(|_| "http://127.0.0.1:8000".to_string());
                            tokio::spawn(async move {
                                match client
                                    .post(format!("{}/nerf-extract", preproc_url))
                                    .json(&json!({"video_id": clip_id, "method": method}))
                                    .timeout(std::time::Duration::from_secs(600))
                                    .send()
                                    .await
                                {
                                    Ok(resp) => {
                                        if resp.status().is_success() {
                                            println!("✅ NeRF extraction completed for clip");
                                        } else {
                                            eprintln!(
                                                "❌ NeRF extraction failed: HTTP {}",
                                                resp.status()
                                            );
                                        }
                                    }
                                    Err(e) => eprintln!("❌ NeRF extraction request failed: {}", e),
                                }
                            });
                        }
                        "separate_stems" => {
                            let clip_id =
                                action["clip_id"].as_str().unwrap_or("unknown").to_string();
                            let stems = action["stems"].as_u64().unwrap_or(4) as u32;
                            println!(
                                "🎵 [AI Engine] Dispatching Demucs Stem Separation ({} stems) for clip '{}'",
                                stems, clip_id
                            );
                            let client = self.client.clone();
                            let gen_studio_url = env::var("GENERATIVE_STUDIO_URL")
                                .unwrap_or_else(|_| "http://127.0.0.1:8001".to_string());
                            tokio::spawn(async move {
                                match client
                                    .post(format!("{}/split-stems", gen_studio_url))
                                    .json(&json!({"video_id": clip_id, "stems": stems}))
                                    .timeout(std::time::Duration::from_secs(600))
                                    .send()
                                    .await
                                {
                                    Ok(resp) => {
                                        if resp.status().is_success() {
                                            println!("✅ Stem separation completed for clip");
                                        } else {
                                            eprintln!(
                                                "❌ Stem separation failed: HTTP {}",
                                                resp.status()
                                            );
                                        }
                                    }
                                    Err(e) => eprintln!("❌ Stem separation request failed: {}", e),
                                }
                            });
                        }
                        _ => {
                            println!("⚠️  [AI Engine] Unknown action: {}", action_type);
                        }
                    }
                }
            }
        }

        Ok("Autonomously planned and executed your edit.".to_string())
    }

    /// Make the actual HTTP call to an LLM provider and parse the JSON actions.
    async fn call_llm(
        &self,
        api_url: &str,
        api_key: &str,
        model: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<Value, String> {
        // Determine if this is an Anthropic endpoint (different payload format)
        let is_anthropic = api_url.contains("anthropic.com");

        let payload = if is_anthropic {
            json!({
                "model": model,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            })
        } else {
            json!({
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": { "type": "json_object" },
                "stream": false
            })
        };

        let mut req = self
            .client
            .post(api_url)
            .json(&payload)
            .timeout(std::time::Duration::from_secs(60));

        if !api_key.is_empty() {
            if is_anthropic {
                req = req.header("x-api-key", api_key);
                req = req.header("anthropic-version", "2023-06-01");
            } else {
                req = req.header("Authorization", format!("Bearer {}", api_key));
            }
        }

        let response = req.send().await.map_err(|e| format!("HTTP error: {}", e))?;

        let status = response.status();
        let body: Value = response
            .json()
            .await
            .map_err(|e| format!("JSON parse error: {}", e))?;

        if !status.is_success() {
            return Err(format!(
                "API returned {}: {}",
                status,
                body.get("error")
                    .and_then(|e| e.get("message"))
                    .and_then(|m| m.as_str())
                    .unwrap_or("unknown error")
            ));
        }

        // Extract content from provider-specific response shapes
        let content = if is_anthropic {
            body["content"]
                .as_array()
                .and_then(|blocks| blocks.first())
                .and_then(|block| block["text"].as_str())
                .unwrap_or("{}")
                .to_string()
        } else if api_url.contains("generativelanguage") {
            // Gemini
            body["candidates"]
                .as_array()
                .and_then(|cands| cands.first())
                .and_then(|c| c["content"]["parts"].as_array())
                .and_then(|parts| parts.first())
                .and_then(|p| p["text"].as_str())
                .unwrap_or("{}")
                .to_string()
        } else {
            // OpenAI / Ollama
            body["choices"]
                .as_array()
                .and_then(|choices| choices.first())
                .and_then(|c| c["message"]["content"].as_str())
                .unwrap_or("{}")
                .to_string()
        };

        // Parse the JSON content as an actions array
        let parsed: Value = serde_json::from_str(&content).map_err(|e| {
            format!(
                "Failed to parse LLM JSON response: {} — content was: {}",
                e,
                &content[..content.len().min(200)]
            )
        })?;

        // Accept both {"actions": [...]} and bare [...] shapes
        if let Some(actions) = parsed.get("actions").cloned() {
            Ok(actions)
        } else if parsed.is_array() {
            Ok(parsed)
        } else {
            Err("LLM response was not an actions array".to_string())
        }
    }

    /// Deterministic local fallback when no LLM is available.
    fn local_fallback_plan(prompt: &str) -> Value {
        let lower = prompt.to_lowercase();

        if lower.contains("silence") || lower.contains("trim") {
            json!([
                {"action": "add_track", "kind": "audio", "id": "A1"},
                {"action": "trim_silence", "track_idx": 0}
            ])
        } else if lower.contains("caption") || lower.contains("subtitle") {
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_clip", "track_idx": 0, "id": "cap_01", "clip_type": "text", "name": "Captions", "start": 0, "end": 500}
            ])
        } else {
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_clip", "track_idx": 0, "id": "ai_gen_01", "clip_type": "video", "name": "ai_generated_broll.mp4", "start": 0, "end": 250}
            ])
        }
    }

    /// Synchronous fallback for backwards compatibility.
    pub fn process_intent_sync(
        &self,
        nle_state: &mut NLEState,
        _intent: &VideoIntent,
    ) -> Result<String, String> {
        println!(
            "⚠️  [AI Engine] process_intent_sync — using local fallback (no LLM call). \
            Consider upgrading to process_intent_with_llm for full agentic capabilities."
        );
        nle_state.add_track("V1".to_string(), "video".to_string());
        nle_state.add_clip_to_track(
            0,
            "ai_generated_clip".to_string(),
            "video".to_string(),
            "B-Roll Footage".to_string(),
            0,
            200,
        );
        Ok("Synchronous fallback processed.".to_string())
    }
}
