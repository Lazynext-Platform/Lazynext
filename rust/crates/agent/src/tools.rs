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
        }
    ]
}
