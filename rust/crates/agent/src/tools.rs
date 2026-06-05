use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

pub fn get_available_tools() -> Vec<Tool> {
    vec![
        Tool {
            name: "cut_silences".to_string(),
            description: "Analyzes the video and automatically removes all silent portions, performing jump cuts.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
        },
        Tool {
            name: "color_grade".to_string(),
            description: "Applies a specific color grading or film emulation shader to the footage.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "look": { "type": "string", "description": "The look to apply, e.g. 'teal_and_orange', 'cyberpunk', 'vintage'" }
                },
                "required": ["look"]
            }),
        },
        Tool {
            name: "add_text_overlay".to_string(),
            description: "Adds a text caption, title, or subtitle to the video at a specific timestamp.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "The text to display" },
                    "start_time_sec": { "type": "number", "description": "Start time in seconds" },
                    "duration_sec": { "type": "number", "description": "Duration in seconds" }
                },
                "required": ["text", "start_time_sec", "duration_sec"]
            }),
        },
        Tool {
            name: "duck_audio".to_string(),
            description: "Automatically lowers the volume of background music tracks whenever speech is detected on the main vocal track.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
        },
        Tool {
            name: "add_transition".to_string(),
            description: "Adds a transition effect between two consecutive clips.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "type": { "type": "string", "description": "The type of transition, e.g., 'crossfade', 'wipe', 'dip_to_black'" },
                    "duration_frames": { "type": "number", "description": "Duration of the transition in frames" }
                },
                "required": ["type", "duration_frames"]
            }),
        },
        Tool {
            name: "crop_and_pan".to_string(),
            description: "Applies a dynamic crop and pan (Ken Burns) effect to a clip.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "start_scale": { "type": "number", "description": "Initial scale factor" },
                    "end_scale": { "type": "number", "description": "Final scale factor" },
                    "pan_x": { "type": "number", "description": "Horizontal pan distance" },
                    "pan_y": { "type": "number", "description": "Vertical pan distance" }
                },
                "required": ["start_scale", "end_scale"]
            }),
        },
        Tool {
            name: "generate_subtitles".to_string(),
            description: "Automatically transcribes audio and generates subtitle layers.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "style": { "type": "string", "description": "Subtitle styling preset (e.g. 'tiktok_bold', 'cinematic')" }
                },
                "required": ["style"]
            }),
        },
        Tool {
            name: "transcribe_video".to_string(),
            description: "Transcribes the spoken words in the video using an AI Whisper model.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "language": { "type": "string", "description": "The language code, e.g. 'en', or 'auto'" }
                },
                "required": []
            }),
        }
    ]
}
