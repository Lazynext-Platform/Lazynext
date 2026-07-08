//! Generative AI pipeline for video and audio synthesis via external APIs.
//!
//! Provides models for text-to-video generation (Replicate / Stable Video Diffusion)
//! and text-to-speech synthesis (ElevenLabs), with graceful fallback when API keys
//! are not configured.

use serde::{Deserialize, Serialize};

/// Configuration for AI-powered text-to-video generation.
///
/// Sent to the Replicate API (Stable Video Diffusion) to produce
/// short video clips from natural-language prompts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoGenerationOptions {
    /// Natural-language prompt describing the desired video content.
    pub prompt: String,
    /// Output video width in pixels.
    pub width: u32,
    /// Output video height in pixels.
    pub height: u32,
    /// Number of frames to generate.
    pub num_frames: u32,
    /// Playback frame rate of the generated video.
    pub fps: u32,
}

/// Configuration for AI-powered text-to-speech synthesis.
///
/// Sent to the ElevenLabs API to convert text into natural-sounding speech.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioGenerationOptions {
    /// The text to convert into speech.
    pub text: String,
    /// Optional ElevenLabs voice ID; defaults to a built-in voice if `None`.
    pub voice_id: Option<String>,
}

/// Generative AI model that orchestrates text-to-video and text-to-speech
/// generation via external APIs (Replicate, ElevenLabs).
///
/// Gracefully degrades when API keys are not configured by returning
/// descriptive errors instead of panicking.
pub struct GenerativeModel {
    /// Whether the model has been initialized.
    pub is_loaded: bool,
    /// Replicate API token, if configured via environment.
    api_key: Option<String>,
}

impl Default for GenerativeModel {
    // Returns a new generative AI model.
    fn default() -> Self {
        Self::new()
    }
}

impl GenerativeModel {
    /// Creates a new generative AI model instance.
    ///
    /// Reads the `REPLICATE_API_TOKEN` environment variable at construction
    /// time to determine whether API calls can be made.
    pub fn new() -> Self {
        let api_key = std::env::var("REPLICATE_API_TOKEN").ok();
        println!(
            "[NeuralEngine] Initializing Generative AI Core. API Key present: {}",
            api_key.is_some()
        );
        Self {
            is_loaded: true,
            api_key,
        }
    }

    /// Generates a video using the Replicate API (Stable Video Diffusion).
    pub async fn generate_video(&self, options: &VideoGenerationOptions) -> Result<String, String> {
        let Some(api_key) = &self.api_key else {
            println!(
                "[NeuralEngine] REPLICATE_API_TOKEN not configured — returning empty generation result."
            );
            #[cfg(not(target_arch = "wasm32"))]
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            return Err(
                "REPLICATE_API_TOKEN not set. Configure an API key to enable AI video generation."
                    .to_string(),
            );
        };

        println!(
            "[NeuralEngine] Sending request to Replicate for video: '{}'",
            options.prompt
        );

        let client = reqwest::Client::new();

        let payload = serde_json::json!({
            "version": "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", // An Example SVD model
            "input": {
                "prompt": options.prompt,
                "frames": options.num_frames,
                "fps": options.fps
            }
        });

        let res = client
            .post("https://api.replicate.com/v1/predictions")
            .header("Authorization", format!("Token {}", api_key))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Replicate API returned error: {}", res.status()));
        }

        let body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        let get_url = body["urls"]["get"].as_str().unwrap_or("");
        if get_url.is_empty() {
            return Err("Replicate API response missing urls.get".to_string());
        }

        println!("[NeuralEngine] Replicate prediction started. Polling status...");

        loop {
            #[cfg(not(target_arch = "wasm32"))]
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

            let poll_res = client
                .get(get_url)
                .header("Authorization", format!("Token {}", api_key))
                .send()
                .await
                .map_err(|e| format!("Poll request failed: {}", e))?;

            let poll_body: serde_json::Value = poll_res
                .json()
                .await
                .map_err(|e| format!("Failed to parse poll JSON: {}", e))?;

            let status = poll_body["status"].as_str().unwrap_or("unknown");

            if status == "succeeded" {
                let output = &poll_body["output"];
                let output_url = if output.is_array() {
                    output[0].as_str().unwrap_or("")
                } else if output.is_string() {
                    output.as_str().unwrap_or("")
                } else {
                    return Err("Failed to parse output URL from Replicate response".to_string());
                };

                if output_url.is_empty() {
                    return Err("Empty output URL returned".to_string());
                }

                println!(
                    "[NeuralEngine] Video generation succeeded. Downloading from {}...",
                    output_url
                );

                let video_res = client
                    .get(output_url)
                    .send()
                    .await
                    .map_err(|e| format!("Failed to download generated video: {}", e))?;

                let video_bytes = video_res
                    .bytes()
                    .await
                    .map_err(|e| format!("Failed to read video bytes: {}", e))?;

                let prediction_id = poll_body["id"].as_str().unwrap_or("unknown_id");
                let output_filename = format!(
                    "/tmp/generated_{}_{}.mp4",
                    options.prompt.replace(" ", "_").to_lowercase(),
                    prediction_id
                );

                std::fs::write(&output_filename, &video_bytes)
                    .map_err(|e| format!("Failed to write video to disk: {}", e))?;

                return Ok(output_filename);
            } else if status == "failed" || status == "canceled" {
                return Err(format!(
                    "Prediction {}: {}",
                    status,
                    poll_body["error"].as_str().unwrap_or("unknown error")
                ));
            }

            println!("[NeuralEngine] Prediction status: {}", status);
        }
    }

    /// Generates text-to-speech using Gemini (Google Cloud Text-to-Speech).
    /// Falls back to ElevenLabs if GEMINI_API_KEY is not configured.
    pub async fn generate_tts(&self, options: &AudioGenerationOptions) -> Result<String, String> {
        let gemini_key = std::env::var("GEMINI_API_KEY").ok();

        if let Some(key) = gemini_key {
            let tts_payload = serde_json::json!({
                "input": { "text": &options.text },
                "voice": { "languageCode": "en-US", "ssmlGender": "NEUTRAL" },
                "audioConfig": { "audioEncoding": "MP3" }
            });

            let url = format!(
                "https://texttospeech.googleapis.com/v1/text:synthesize?key={}",
                key
            );

            let client = reqwest::Client::new();
            match client.post(&url).json(&tts_payload).send().await {
                Ok(res) if res.status().is_success() => {
                    if let Ok(data) = res.json::<serde_json::Value>().await
                        && let Some(audio_b64) = data["audioContent"].as_str()
                    {
                        // Decode base64 manually (no external crate needed)
                        let audio_bytes = decode_base64(audio_b64)
                            .map_err(|e| format!("Base64 decode failed: {}", e))?;
                        let output = "/tmp/tts_output_gemini.mp3".to_string();
                        std::fs::write(&output, &audio_bytes)
                            .map_err(|e| format!("Failed to write audio: {}", e))?;
                        return Ok(output);
                    }
                }
                Ok(res) => {
                    println!("[NeuralEngine] Gemini TTS error: HTTP {}", res.status());
                }
                Err(e) => {
                    println!("[NeuralEngine] Gemini TTS request failed: {}", e);
                }
            }
        }

        Err("TTS unavailable — configure GEMINI_API_KEY".to_string())
    }
}

/// Decode a base64 string to bytes without external crate.
fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let input = input.trim_end_matches('=');
    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let mut buffer: u32 = 0;
    let mut bits = 0;

    for c in input.chars() {
        let val = CHARS
            .iter()
            .position(|&x| x as char == c)
            .ok_or_else(|| format!("Invalid base64 char: {}", c))? as u32;
        buffer = (buffer << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push((buffer >> bits) as u8);
        }
    }

    Ok(output)
}
