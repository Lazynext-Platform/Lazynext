use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoGenerationOptions {
    pub prompt: String,
    pub width: u32,
    pub height: u32,
    pub num_frames: u32,
    pub fps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioGenerationOptions {
    pub text: String,
    pub voice_id: Option<String>,
}

pub struct GenerativeModel {
    pub is_loaded: bool,
    api_key: Option<String>,
}

impl Default for GenerativeModel {
    fn default() -> Self {
        Self::new()
    }
}

impl GenerativeModel {
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

    /// Generates text-to-speech using an external API.
    pub async fn generate_tts(&self, options: &AudioGenerationOptions) -> Result<String, String> {
        let Some(api_key) = &self.api_key else {
            println!("[NeuralEngine] TTS API key not configured — returning empty result.");
            #[cfg(not(target_arch = "wasm32"))]
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            return Err("API key not set. Configure a key to enable TTS generation.".to_string());
        };

        println!(
            "[NeuralEngine] Sending request to TTS provider for: '{}'",
            options.text
        );

        // Simulated HTTP call for TTS logic
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "text": options.text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        });

        // E.g. targeting ElevenLabs API
        let voice_id = options
            .voice_id
            .as_deref()
            .unwrap_or("21m00Tcm4TlvDq8ikWAM");
        let url = format!("https://api.elevenlabs.io/v1/text-to-speech/{}", voice_id);

        let res = client
            .post(&url)
            .header("xi-api-key", api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("TTS API returned error: {}", res.status()));
        }

        let audio_bytes = res
            .bytes()
            .await
            .map_err(|e| format!("Failed to read audio bytes: {}", e))?;

        let output_filename = format!("/tmp/tts_output_{}.wav", voice_id);
        std::fs::write(&output_filename, &audio_bytes)
            .map_err(|e| format!("Failed to write audio to disk: {}", e))?;

        Ok(output_filename)
    }
}
