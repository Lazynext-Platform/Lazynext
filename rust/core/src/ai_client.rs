//! AI service client for rotoscoping, NeRF extraction, and audio stem splitting.

use reqwest::Client;
use serde::{Deserialize, Serialize};

/// A rotoscoping request containing a video ID and the object to mask.
#[derive(Serialize)]
pub struct RotoscopeRequest {
    pub video_id: String,
    pub object_prompt: String,
}

/// A rotoscoping response with a success flag and optional mask sequence URL.
#[derive(Deserialize, Debug)]
pub struct RotoscopeResponse {
    pub success: bool,
    pub mask_sequence_url: Option<String>,
}

/// A NeRF extraction request containing a video ID.
#[derive(Serialize)]
pub struct NeRFRequest {
    pub video_id: String,
}

/// A NeRF extraction response with optional mesh and point cloud URLs.
#[derive(Deserialize, Debug)]
pub struct NeRFResponse {
    pub success: bool,
    pub mesh_url: Option<String>,
    pub point_cloud_url: Option<String>,
}

/// A stem separation request with an audio ID and desired stem count.
#[derive(Serialize)]
pub struct StemSplitRequest {
    pub audio_id: String,
    pub stems: u32,
}

/// A stem separation response with a map of stem name to audio URL.
#[derive(Deserialize, Debug)]
pub struct StemSplitResponse {
    pub success: bool,
    pub stems: std::collections::HashMap<String, String>,
}

/// HTTP client for AI-powered video operations: rotoscoping, NeRF extraction,
/// and audio stem splitting. Communicates with the pre-processing and
/// generative studio microservices.
pub struct AIClient {
    client: Client,
    pre_processing_url: String,
    generative_studio_url: String,
}

impl Default for AIClient {
    fn default() -> Self {
        Self::new()
    }
}

impl AIClient {
    /// Creates a new `AIClient` pointing to the default local service URLs.
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            pre_processing_url: "http://localhost:8000".to_string(),
            generative_studio_url: "http://localhost:8001".to_string(),
        }
    }

    /// Sends a rotoscoping request to the pre-processing service for the
    /// given video and object prompt. Returns the mask sequence URL on success.
    pub async fn rotoscope(
        &self,
        video_id: &str,
        prompt: &str,
    ) -> Result<RotoscopeResponse, String> {
        let req = RotoscopeRequest {
            video_id: video_id.to_string(),
            object_prompt: prompt.to_string(),
        };
        let res = self
            .client
            .post(&format!("{}/api/v1/cv/rotoscope", self.pre_processing_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        res.json::<RotoscopeResponse>()
            .await
            .map_err(|e| e.to_string())
    }

    /// Sends a NeRF extraction request to the pre-processing service for
    /// the given video. Returns mesh and point cloud URLs on success.
    pub async fn extract_nerf(&self, video_id: &str) -> Result<NeRFResponse, String> {
        let req = NeRFRequest {
            video_id: video_id.to_string(),
        };
        let res = self
            .client
            .post(&format!(
                "{}/api/v1/cv/nerf-extract",
                self.pre_processing_url
            ))
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        res.json::<NeRFResponse>().await.map_err(|e| e.to_string())
    }

    /// Sends a stem separation request to the generative studio service for
    /// the given audio, splitting it into the specified number of stems.
    pub async fn split_stems(
        &self,
        audio_id: &str,
        stems: u32,
    ) -> Result<StemSplitResponse, String> {
        let req = StemSplitRequest {
            audio_id: audio_id.to_string(),
            stems,
        };
        let res = self
            .client
            .post(&format!("{}/split-stems", self.generative_studio_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        res.json::<StemSplitResponse>()
            .await
            .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_client_structs() {
        let req = RotoscopeRequest {
            video_id: "vid_1".to_string(),
            object_prompt: "dog".to_string(),
        };
        assert_eq!(req.video_id, "vid_1");
        assert_eq!(req.object_prompt, "dog");

        // This won't actually call the python server if we don't invoke the method
        // but it tests compilation of the client.
        let client = AIClient::new();
        assert_eq!(client.pre_processing_url, "http://localhost:8000");
    }
}
