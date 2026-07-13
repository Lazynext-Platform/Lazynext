//! Generative AI pipeline for video and audio synthesis via external APIs.
//!
//! Provides models for text-to-video generation (Fal.ai + Kling 3.0)
//! and text-to-speech synthesis (delegated to generative-studio service
//! which uses Edge TTS — free, unlimited, 300+ voices).

use serde::{Deserialize, Serialize};

/// Configuration for AI-powered text-to-video generation.
///
/// Sent to the Fal.ai API (Kling 3.0) to produce short video clips
/// from natural-language prompts.
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
/// Delegated to the generative-studio service which uses Edge TTS
/// (Microsoft) — free, unlimited, no API key required.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioGenerationOptions {
	/// The text to convert into speech.
	pub text: String,
	/// Optional voice ID; defaults to a built-in voice if `None`.
	pub voice_id: Option<String>,
}

/// Generative AI model that orchestrates text-to-video and text-to-speech
/// generation via external APIs (Fal.ai Kling, Edge TTS via generative-studio).
///
/// Gracefully degrades when services are not reachable by returning
/// descriptive errors instead of panicking.
pub struct GenerativeModel {
	/// Whether the model has been initialized.
	pub is_loaded: bool,
	/// Fal.ai API key, if configured via environment.
	fal_key: Option<String>,
}

impl Default for GenerativeModel {
	fn default() -> Self {
		Self::new()
	}
}

impl GenerativeModel {
	/// Creates a new generative AI model instance.
	///
	/// Reads the `FAL_KEY` environment variable at construction time
	/// to determine whether Fal.ai API calls can be made.
	/// Falls back to `FAL_API_KEY` as an alias.
	pub fn new() -> Self {
		let fal_key = std::env::var("FAL_KEY")
			.ok()
			.or_else(|| std::env::var("FAL_API_KEY").ok());
		println!(
			"[NeuralEngine] Initializing Generative AI Core. Fal.ai Key present: {}",
			fal_key.is_some()
		);
		Self {
			is_loaded: true,
			fal_key,
		}
	}

	/// Returns the configured Fal.ai Kling model ID.
	/// Configurable via `FAL_VIDEO_MODEL` env var; defaults to Kling 3.0.
	fn video_model() -> String {
		std::env::var("FAL_VIDEO_MODEL").unwrap_or_else(|_| {
			"fal-ai/kling-video/o3/standard/text-to-video".to_string()
		})
	}

	/// Generates a video using the Fal.ai Kling API.
	///
	/// Submits a text-to-video generation job to Fal.ai's queue and polls
	/// until the video is ready, then downloads and saves it locally.
	pub async fn generate_video(&self, options: &VideoGenerationOptions) -> Result<String, String> {
		let Some(fal_key) = &self.fal_key else {
			println!(
				"[NeuralEngine] FAL_KEY not configured — returning empty generation result."
			);
			#[cfg(not(target_arch = "wasm32"))]
			tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
			return Err(
				"FAL_KEY not set. Configure an API key to enable AI video generation."
					.to_string(),
			);
		};

		let model_id = Self::video_model();
		let queue_url = format!("https://queue.fal.run/{}", model_id);

		println!(
			"[NeuralEngine] Sending request to Fal.ai ({}) for video: '{}'",
			model_id, options.prompt
		);

		let client = reqwest::Client::new();

		let duration = (options.num_frames as f64 / options.fps as f64).ceil() as u32;
		let payload = serde_json::json!({
			"prompt": options.prompt,
			"duration": duration.to_string(),
			"aspect_ratio": "16:9"
		});

		let res = client
			.post(&queue_url)
			.header("Authorization", format!("Key {}", fal_key))
			.header("Content-Type", "application/json")
			.json(&payload)
			.send()
			.await
			.map_err(|e| format!("Fal.ai request failed: {}", e))?;

		if !res.status().is_success() {
			let status = res.status();
			let body = res.text().await.unwrap_or_default();
			return Err(format!("Fal.ai API returned HTTP {}: {}", status, body));
		}

		let body: serde_json::Value = res
			.json()
			.await
			.map_err(|e| format!("Failed to parse Fal.ai response: {}", e))?;

		let request_id = body["request_id"].as_str().unwrap_or("");
		if request_id.is_empty() {
			return Err("Fal.ai response missing request_id".to_string());
		}

		println!(
			"[NeuralEngine] Fal.ai job submitted (request_id: {}). Polling status...",
			request_id
		);

		let status_url = format!(
			"https://queue.fal.run/{}/requests/{}/status",
			model_id, request_id
		);

		loop {
			#[cfg(not(target_arch = "wasm32"))]
			tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

			let poll_res = client
				.get(&status_url)
				.header("Authorization", format!("Key {}", fal_key))
				.send()
				.await
				.map_err(|e| format!("Fal.ai status poll failed: {}", e))?;

			let poll_body: serde_json::Value = poll_res
				.json()
				.await
				.map_err(|e| format!("Failed to parse Fal.ai status JSON: {}", e))?;

			let status = poll_body["status"].as_str().unwrap_or("unknown");

			if status == "COMPLETED" {
				let video = &poll_body["video"];
				let output_url = video["url"].as_str().unwrap_or("");

				if output_url.is_empty() {
					return Err("Empty video URL in Fal.ai response".to_string());
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

				let safe_prompt = options
					.prompt
					.chars()
					.take(60)
					.map(|c| if c.is_alphanumeric() || c == ' ' { c } else { '_' })
					.collect::<String>()
					.trim()
					.replace(' ', "_");
				let output_filename = format!("/tmp/generated_{}_{}.mp4", safe_prompt, request_id);

				std::fs::write(&output_filename, &video_bytes)
					.map_err(|e| format!("Failed to write video to disk: {}", e))?;

				return Ok(output_filename);
			} else if status == "FAILED" || status == "CANCELLED" {
				let error_msg = poll_body["error"]
					.as_str()
					.unwrap_or("unknown error");
				return Err(format!("Fal.ai job {}: {}", status, error_msg));
			}

			println!("[NeuralEngine] Fal.ai job status: {}", status);
		}
	}

	/// Generates text-to-speech via the generative-studio service (Edge TTS).
	///
	/// Delegates to the Python generative-studio service which uses
	/// Microsoft Edge TTS — free, unlimited, 300+ neural voices across
	/// 100+ languages. No API key required.
	pub async fn generate_tts(&self, options: &AudioGenerationOptions) -> Result<String, String> {
		let tts_url = std::env::var("GENERATIVE_STUDIO_URL")
			.unwrap_or_else(|_| "http://localhost:8001".to_string());

		let tts_payload = serde_json::json!({
			"clip_id": "rust_tts",
			"target_language": "en",
			"text_to_dub": &options.text,
		});

		let client = reqwest::Client::new();
		let res = client
			.post(format!("{}/dub", tts_url))
			.json(&tts_payload)
			.send()
			.await
			.map_err(|e| format!("Failed to reach generative-studio TTS service: {}", e))?;

		if !res.status().is_success() {
			let status = res.status();
			let body = res.text().await.unwrap_or_default();
			return Err(format!(
				"TTS service returned HTTP {}: {}. Ensure generative-studio is running and edge-tts is installed.",
				status, body
			));
		}

		let data: serde_json::Value = res
			.json()
			.await
			.map_err(|e| format!("Failed to parse TTS response: {}", e))?;

		if data["success"].as_bool() != Some(true) {
			let detail = data["detail"].as_str().unwrap_or("unknown error");
			return Err(format!("TTS generation failed: {}", detail));
		}

		let audio_url = data["audio_url"].as_str().unwrap_or("");
		if audio_url.is_empty() {
			return Err("Empty audio URL in TTS response".to_string());
		}

		if let Some(local_path) = audio_url.strip_prefix("file://") {
			let output = "/tmp/tts_output_edge.mp3".to_string();
			std::fs::copy(local_path, &output)
				.map_err(|e| format!("Failed to copy audio file: {}", e))?;
			return Ok(output);
		}

		let audio_res = client
			.get(audio_url)
			.send()
			.await
			.map_err(|e| format!("Failed to download audio: {}", e))?;

		let audio_bytes = audio_res
			.bytes()
			.await
			.map_err(|e| format!("Failed to read audio bytes: {}", e))?;

		let output = "/tmp/tts_output_edge.mp3".to_string();
		std::fs::write(&output, &audio_bytes)
			.map_err(|e| format!("Failed to write audio file: {}", e))?;

		Ok(output)
	}
}
