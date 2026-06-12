use serde::{Deserialize, Serialize};
use crate::NLEState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoIntent {
    pub prompt: String,
    pub require_plan_approval: bool,
    pub source_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum JobStatus {
    Pending,
    Planning,
    AwaitingApproval { plan: String },
    Executing,
    Completed { video_url: String },
    Failed { error: String },
}

pub struct AutonomousEditor {
    // In the future, this holds the backend client (e.g. for api.livecore.ai)
}

impl AutonomousEditor {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn process_intent(&self, intent: VideoIntent) -> Result<String, String> {
        // The natural language prompt is delegated to the specialized backend.
        // The backend planner will decompose this intent, apply safety gates, 
        // and execute tasks in the correct order.
        println!("Delegating intent to planner: {}", intent.prompt);
        
        // Mock job creation
        let job_id = "job_9999".to_string();
        Ok(job_id)
    }

    pub async fn check_job_status(&self, job_id: &str) -> Result<JobStatus, String> {
        // Mock status polling
        Ok(JobStatus::Completed { 
            video_url: format!("https://cdn.lazynext.ai/videos/{}.mp4", job_id) 
        })
    }

    /// Directly and synchronously modifies the NLEState autonomously based on natural language
    pub fn process_intent_sync(&self, nle_state: &mut NLEState, intent: &VideoIntent) -> Result<String, String> {
        println!("🧠 [AI Engine] Processing intent synchronously: {}", intent.prompt);
        
        let prompt_lower = intent.prompt.to_lowercase();
        
        // Simulating the AI understanding the text and editing the timeline directly
        if prompt_lower.contains("cut") || prompt_lower.contains("trim") {
            println!("✂️ [AI Engine] Intent understood: Trim/Cut.");
            // Example modification: autonomously add a cut
            nle_state.add_clip_to_track(
                0, 
                "ai_cut_clip_1".to_string(), 
                "video".to_string(), 
                "AI Cut Source".to_string(), 
                50, 
                100
            );
            return Ok("Autonomously trimmed the footage.".to_string());
        } else if prompt_lower.contains("music") || prompt_lower.contains("audio") {
            println!("🎵 [AI Engine] Intent understood: Audio Addition.");
            nle_state.add_track("AI Audio".to_string(), "audio".to_string());
            nle_state.add_clip_to_track(
                1, 
                "ai_bg_music_1".to_string(), 
                "audio".to_string(), 
                "Cinematic Track".to_string(), 
                0, 
                150
            );
            return Ok("Autonomously added cinematic background music.".to_string());
        }
        
        // Fallback generic edit
        println!("✨ [AI Engine] Intent understood: Generic Edit.");
        nle_state.add_clip_to_track(
            0, 
            "ai_generated_clip".to_string(), 
            "video".to_string(), 
            "B-Roll Footage".to_string(), 
            0, 
            200
        );

        Ok("Autonomously processed your prompt and edited the timeline.".to_string())
    }
}
