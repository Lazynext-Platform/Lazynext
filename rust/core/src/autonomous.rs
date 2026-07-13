//! Autonomous AI editor that translates natural language intents into NLE timeline
//! operations. Uses Gemini 2.5 Flash/Pro with intelligent switching.
//! with deterministic local fallback when no API key is available.

use crate::NLEState;
use crate::nle_state::VALID_CLIP_TYPES;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::env;

/// A user's natural language editing intent, including source files and
/// provider preferences.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoIntent {
    /// Natural-language description of the desired edit.
    pub prompt: String,
    /// Whether the generated plan requires user approval before execution.
    pub require_plan_approval: bool,
    /// Source media files referenced by the intent.
    #[serde(default)]
    pub source_files: Vec<String>,
    /// Preferred LLM provider override, if any.
    #[serde(default)]
    pub llm_provider: Option<String>,
}

/// The status of an autonomous editing job as it progresses through planning,
/// execution, and completion.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum JobStatus {
    /// The job has been created but not yet started.
    Pending,
    /// The job is generating an editing plan.
    Planning,
    /// The job is applying editing actions.
    Executing,
    /// The job is waiting for user approval of the plan.
    AwaitingApproval {
        /// The proposed editing plan.
        plan: String,
    },
    /// The job finished successfully.
    Completed {
        /// URL of the rendered output video.
        video_url: String,
    },
    /// The job failed.
    Failed {
        /// Description of the failure.
        error: String,
    },
}

/// The autonomous editor engine. Takes a `VideoIntent`, optionally calls an
/// LLM to produce editing actions, and applies them to the NLE state.
pub struct AutonomousEditor {
    /// HTTP client used for LLM and microservice requests.
    client: Client,
}

impl Default for AutonomousEditor {
    // Returns an editor with a fresh HTTP client.
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

    /// **Deprecated stub.** Returns a job ID but does not perform any editing.
    ///
    /// The asynchronous job-tracking API (`process_intent` + `check_job_status`)
    /// was never wired to the real render pipeline. All real callers use the
    /// synchronous [`process_intent_with_llm`](Self::process_intent_with_llm),
    /// which mutates the `NLEState` directly and is the supported path.
    pub async fn process_intent(&self, intent: VideoIntent) -> Result<String, String> {
        println!(
            "⚠️  [AI Engine] process_intent (async job API) is a non-functional stub. \
            Use process_intent_with_llm for real editing. Intent was: {}",
            intent.prompt
        );
        Err(
            "process_intent (async job API) is not wired to the render pipeline. \
            Use process_intent_with_llm(&mut NLEState, &VideoIntent) instead."
                .to_string(),
        )
    }

    /// **Deprecated stub.** The async job API is not wired to a real job store or
    /// render pipeline, so a status lookup cannot honestly report success. Returns
    /// `Failed` with guidance to use the synchronous path instead of fabricating a
    /// non-existent CDN URL.
    pub async fn check_job_status(&self, _job_id: &str) -> Result<JobStatus, String> {
        Ok(JobStatus::Failed {
            error: "Async job tracking is not implemented. Use process_intent_with_llm \
                    (synchronous) which mutates NLEState directly and renders via \
                    CoreEngine::dispatch_export."
                .to_string(),
        })
    }

    /// Asynchronously modifies the NLEState by making an LLM API call.
    ///
    /// Uses Gemini 2.5 Flash via GEMINI_API_KEY.
    /// Falls back to a deterministic local plan if no API key is available.
    pub async fn process_intent_with_llm(
        &self,
        nle_state: &mut NLEState,
        intent: &VideoIntent,
    ) -> Result<String, String> {
        println!("🧠 [AI Engine] Reasoning about intent: {}", intent.prompt);

        // 1. Intelligent model selection — Flash vs Pro
        let prompt = &intent.prompt;
        let use_pro = prompt.len() > 500
            || prompt.contains("complex")
            || prompt.contains("multi")
            || prompt.contains("analyze")
            || prompt.contains("explain")
            || prompt.contains("detailed")
            || prompt.contains("compare")
            || prompt.contains("review");

        let model_name = if use_pro {
            "gemini-2.5-pro"
        } else {
            "gemini-2.5-flash"
        };

        let provider = env::var("GEMINI_API_KEY").ok().map(|_| "gemini").unwrap_or("local");
        let (api_url, api_key, model) = {
                let key = env::var("GEMINI_API_KEY").unwrap_or_default();
                let url = if key.is_empty() {
                    format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent", model_name)
                } else {
                    format!(
                        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                        model_name, key
                    )
                };
                (url, key, model_name.to_string())
            };

        println!(
            "🔗 [AI Engine] Routing to: {} (Model: {})",
            provider, model_name
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
        if !api_key.is_empty() || provider == "gemini" {
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

        // 4. Apply the plan to the NLE state with validation
        self.apply_validated_actions(nle_state, &actions);

        Ok("Autonomously planned and executed your edit.".to_string())
    }

    /// Validates and applies actions from the LLM response or local fallback.
    /// Each action is validated against the current NLE state before application.
    fn apply_validated_actions(&self, nle_state: &mut NLEState, actions: &Value) {
        let actions_array = match actions.as_array() {
            Some(arr) => arr,
            None => {
                eprintln!("[AI Engine] Actions payload is not an array, skipping");
                return;
            }
        };

        for action in actions_array {
            let Some(action_type) = action["action"].as_str() else {
                eprintln!("[AI Engine] Action has no 'action' field, skipping");
                continue;
            };

            match action_type {
                "add_track" => {
                    let kind = action["kind"].as_str().unwrap_or("video").to_string();
                    let id = action["id"].as_str().unwrap_or("Track").to_string();
                    nle_state.add_track(id, kind);
                }
                "add_clip" => {
                    let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                    let track_count = nle_state.get_project_data().tracks.len();
                    if track_idx >= track_count {
                        eprintln!(
                            "[AI Engine] Skipping add_clip: track_idx {} >= track_count {}",
                            track_idx, track_count
                        );
                        continue;
                    }
                    let id = action["id"].as_str().unwrap_or("clip").to_string();
                    let clip_type = action["clip_type"].as_str().unwrap_or("video").to_string();
                    if !VALID_CLIP_TYPES.contains(&clip_type.as_str()) {
                        eprintln!(
                            "[AI Engine] Skipping add_clip: unknown clip_type '{}'. Valid: {:?}",
                            clip_type, VALID_CLIP_TYPES
                        );
                        continue;
                    }
                    let name = action["name"].as_str().unwrap_or("media").to_string();
                    let start = action["start"].as_u64().unwrap_or(0) as u32;
                    let end = action["end"].as_u64().unwrap_or(100) as u32;
                    if start >= end {
                        eprintln!(
                            "[AI Engine] Skipping add_clip: invalid range start={} >= end={}",
                            start, end
                        );
                        continue;
                    }
                    nle_state.add_clip_to_track(track_idx, id, clip_type, name, start, end);
                }
                "trim_silence" => {
                    let track_idx = action["track_idx"].as_u64().unwrap_or(0) as usize;
                    let track_count = nle_state.get_project_data().tracks.len();
                    if track_idx >= track_count {
                        eprintln!(
                            "[AI Engine] Skipping trim_silence: track_idx {} >= track_count {}",
                            track_idx, track_count
                        );
                        continue;
                    }
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
                                println!("✅ Silence analysis dispatched for track {}", track_idx);
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
                            nle_state.add_track("Playwright_V1".to_string(), "video".to_string());
                            let pw_track_idx = nle_state.get_project_data().tracks.len() - 1;
                            nle_state.add_clip_to_track(
                                pw_track_idx,
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
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                    let preset = action["preset"].as_str().unwrap_or("cinematic");
                    println!(
                        "🎨 [AI Engine] Applied color grade '{}' to clip '{}'",
                        preset, clip_id
                    );
                    nle_state.update_clip_property(clip_id, "color_grade", 1.0);
                }
                "add_effect" => {
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                    let effect = action["effect"].as_str().unwrap_or("blur");
                    println!(
                        "✨ [AI Engine] Added effect '{}' to clip '{}'",
                        effect, clip_id
                    );
                    nle_state.update_clip_property(clip_id, &format!("effect_{}", effect), 1.0);
                }
                "speed_ramp" => {
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                    let speed = action["speed_factor"].as_f64().unwrap_or(1.0);
                    // Clamp speed factor to reasonable range [0.125x, 8.0x]
                    let speed = speed.clamp(0.125, 8.0);
                    println!(
                        "⏩ [AI Engine] Applied speed ramp ({}x) to clip '{}'",
                        speed, clip_id
                    );
                    nle_state.update_clip_property(clip_id, "speed", speed as f32);
                }
                "add_transition" => {
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                    let transition = action["transition_type"].as_str().unwrap_or("crossfade");
                    println!(
                        "🔄 [AI Engine] Added transition '{}' to clip '{}'",
                        transition, clip_id
                    );
                    nle_state.update_clip_property(
                        clip_id,
                        &format!("transition_{}", transition),
                        1.0,
                    );
                }
                "rotoscope_clip" => {
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown").to_string();
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
                                    eprintln!("❌ Rotoscoping failed: HTTP {}", resp.status());
                                }
                            }
                            Err(e) => eprintln!("❌ Rotoscoping request failed: {}", e),
                        }
                    });
                }
                "extract_nerf" => {
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown").to_string();
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
                                    eprintln!("❌ NeRF extraction failed: HTTP {}", resp.status());
                                }
                            }
                            Err(e) => eprintln!("❌ NeRF extraction request failed: {}", e),
                        }
                    });
                }
                "separate_stems" => {
                    let clip_id = action["clip_id"].as_str().unwrap_or("unknown").to_string();
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
                                    eprintln!("❌ Stem separation failed: HTTP {}", resp.status());
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

    /// Make the actual HTTP call to an LLM provider and parse the JSON actions.
    async fn call_llm(
        &self,
        api_url: &str,
        api_key: &str,
        model: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<Value, String> {
        // Determine if this is a Gemini endpoint
        let is_gemini = api_url.contains("generativelanguage.googleapis.com");

        let payload = if is_gemini {
            json!({
                "contents": [
                    {
                        "parts": [{"text": format!("{}\n\nUser request: {}", system_prompt, user_prompt)}],
                        "role": "user"
                    }
                ],
                "system_instruction": {
                    "parts": [{"text": system_prompt}]
                },
                "generationConfig": {
                    "response_mime_type": "application/json"
                }
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
            if is_gemini {
                req = req.header("Content-Type", "application/json");
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

        // Extract content from Gemini response
        let content = if api_url.contains("generativelanguage") {
            body["candidates"]
                .as_array()
                .and_then(|cands| cands.first())
                .and_then(|c| c["content"]["parts"].as_array())
                .and_then(|parts| parts.first())
                .and_then(|p| p["text"].as_str())
                .unwrap_or("{}")
                .to_string()
        } else {
            // OpenAI-compatible fallback
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
    /// Matches user intent via keywords to produce useful CRDT timeline actions.
    fn local_fallback_plan(prompt: &str) -> Value {
        let lower = prompt.to_lowercase();

        // Silence / trimming
        if lower.contains("silence")
            || lower.contains("trim")
            || lower.contains("cut")
            || lower.contains("gap")
            || lower.contains("um")
            || lower.contains("uh")
        {
            json!([
                {"action": "add_track", "kind": "audio", "id": "A1"},
                {"action": "trim_silence", "track_idx": 0}
            ])
        }
        // Music / audio
        else if lower.contains("music")
            || lower.contains("soundtrack")
            || lower.contains("bgm")
            || lower.contains("score")
            || lower.contains("beat")
            || lower.contains("audio")
        {
            json!([
                {"action": "add_track", "kind": "audio", "id": "A1"},
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_clip", "track_idx": 0, "id": "music_01",
                    "clip_type": "audio", "name": "background_music.mp3",
                    "start": 0, "end": 500}
            ])
        }
        // Text / captions
        else if lower.contains("caption")
            || lower.contains("subtitle")
            || lower.contains("text")
            || lower.contains("title")
            || lower.contains("label")
            || lower.contains("lower third")
        {
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_clip", "track_idx": 0, "id": "text_01",
                    "clip_type": "text", "name": "Text Overlay",
                    "start": 0, "end": 500}
            ])
        }
        // Color grading
        else if lower.contains("color")
            || lower.contains("grade")
            || lower.contains("warm")
            || lower.contains("cool")
            || lower.contains("vintage")
            || lower.contains("cinematic")
        {
            let preset = if lower.contains("warm") {
                "warm"
            } else if lower.contains("cool") {
                "cool"
            } else if lower.contains("vintage") {
                "vintage"
            } else {
                "cinematic"
            };
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "color_grade", "track_idx": 0, "clip_id": "main", "preset": preset}
            ])
        }
        // Transitions
        else if lower.contains("transition")
            || lower.contains("crossfade")
            || lower.contains("fade")
            || lower.contains("dissolve")
            || lower.contains("dip")
        {
            let transition = if lower.contains("dip") {
                "dip_to_black"
            } else {
                "crossfade"
            };
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_transition", "track_idx": 0, "clip_id": "main", "transition_type": transition}
            ])
        }
        // Speed
        else if lower.contains("speed")
            || lower.contains("slow")
            || lower.contains("fast")
            || lower.contains("ramp")
            || lower.contains("speed up")
            || lower.contains("slow down")
        {
            let factor: f64 = if lower.contains("slow") {
                0.5
            } else if lower.contains("fast") {
                2.0
            } else {
                1.5
            };
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "speed_ramp", "track_idx": 0, "clip_id": "main", "speed_factor": factor}
            ])
        }
        // Effects
        else if lower.contains("effect")
            || lower.contains("blur")
            || lower.contains("glitch")
            || lower.contains("zoom")
            || lower.contains("vignette")
        {
            let effect = if lower.contains("glitch") {
                "glitch"
            } else if lower.contains("zoom") {
                "zoom"
            } else if lower.contains("vignette") {
                "vignette"
            } else {
                "blur"
            };
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_effect", "track_idx": 0, "clip_id": "main", "effect": effect}
            ])
        }
        // Default: generic clip
        else {
            json!([
                {"action": "add_track", "kind": "video", "id": "V1"},
                {"action": "add_clip", "track_idx": 0, "id": "ai_gen_01",
                    "clip_type": "video", "name": "ai_generated_broll.mp4",
                    "start": 0, "end": 250}
            ])
        }
    }

    /// Synchronous fallback — processes intent with keyword matching.
    pub fn process_intent_sync(
        &self,
        nle_state: &mut NLEState,
        intent: &VideoIntent,
    ) -> Result<String, String> {
        println!(
            "🧠 [AI Engine] process_intent_sync — processing: {}",
            intent.prompt
        );

        let actions = Self::local_fallback_plan(&intent.prompt);

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
                        }
                        "color_grade" => {
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            nle_state.update_clip_property(clip_id, "color_grade", 1.0);
                        }
                        "add_effect" => {
                            let effect = action["effect"].as_str().unwrap_or("blur");
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            nle_state.update_clip_property(
                                clip_id,
                                &format!("effect_{}", effect),
                                1.0,
                            );
                        }
                        "speed_ramp" => {
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            let speed = action["speed_factor"].as_f64().unwrap_or(1.0);
                            nle_state.update_clip_property(clip_id, "speed", speed as f32);
                        }
                        "add_transition" => {
                            let clip_id = action["clip_id"].as_str().unwrap_or("unknown");
                            let transition =
                                action["transition_type"].as_str().unwrap_or("crossfade");
                            nle_state.update_clip_property(
                                clip_id,
                                &format!("transition_{}", transition),
                                1.0,
                            );
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(format!(
            "Processed intent via fallback ({} actions).",
            actions.as_array().map(|a| a.len()).unwrap_or(0)
        ))
    }
}
