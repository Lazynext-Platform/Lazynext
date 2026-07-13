//! Generative AI pipeline for video and audio synthesis via external APIs.
//!
//! Provides models for text-to-video generation (Hugging Face Spaces, free)
//! and text-to-speech synthesis (delegated to generative-studio service
//! which uses Edge TTS — free, unlimited, 300+ voices).

use serde::{Deserialize, Serialize};

/// Configuration for AI-powered text-to-video generation.
///
/// Delegated to the generative-studio service which uses Hugging Face
/// Spaces (Wan 2.1) — free, no API key, GPU-accelerated.
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
/// generation via external APIs (HF Spaces + Edge TTS via generative-studio).
///
/// Gracefully degrades when services are not reachable by returning
/// descriptive errors instead of panicking.
pub struct GenerativeModel {
	/// Whether the model has been initialized.
	pub is_loaded: bool,
}

impl Default for GenerativeModel {
	fn default() -> Self {
		Self::new()
	}
}

impl GenerativeModel {
	/// Creates a new generative AI model instance.
	pub fn new() -> Self {
		println!("[NeuralEngine] Initializing Generative AI Core.");
		Self { is_loaded: true }
	}

	/// Generates a video via the generative-studio service (HF Spaces).
	///
	/// Delegates to the Python generative-studio service which uses
	/// Hugging Face Spaces — free, no API key, GPU-accelerated.
	pub async fn generate_video(&self, options: &VideoGenerationOptions) -> Result<String, String> {
		let gs_url = std::env::var("GENERATIVE_STUDIO_URL")
			.unwrap_or_else(|_| "http://localhost:8001".to_string());

		let payload = serde_json::json!({
			"prompt": options.prompt,
			"width": options.width,
			"height": options.height,
			"num_frames": options.num_frames,
		});

		let client = reqwest::Client::new();
		let res = client
			.post(format!("{}/generate-video", gs_url))
			.json(&payload)
			.timeout(std::time::Duration::from_secs(600))
			.send()
			.await
			.map_err(|e| format!("Failed to reach generative-studio video service: {}", e))?;

		if !res.status().is_success() {
			let status = res.status();
			let body = res.text().await.unwrap_or_default();
			return Err(format!(
				"Video generation returned HTTP {}: {}. Install gradio_client or set HF_TOKEN.",
				status, body
			));
		}

		let data: serde_json::Value = res
			.json()
			.await
			.map_err(|e| format!("Failed to parse video response: {}", e))?;

		if data["success"].as_bool() != Some(true) {
			let detail = data["detail"].as_str().unwrap_or("unknown error");
			return Err(format!("Video generation failed: {}", detail));
		}

		let video_url = data["video_url"].as_str().unwrap_or("");
		if let Some(local_path) = video_url.strip_prefix("file://") {
			let output = "/tmp/generated_video.mp4".to_string();
			std::fs::copy(local_path, &output)
				.map_err(|e| format!("Failed to copy video: {}", e))?;
			return Ok(output);
		}

		Err("No video URL in response".to_string())
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
