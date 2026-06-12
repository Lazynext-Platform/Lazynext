use anyhow::Result;
use crate::{AgentFactory, AgentResponse, AgentProvider};

pub struct AutonomousDirector {
    provider: Box<dyn AgentProvider>,
}

impl AutonomousDirector {
    pub fn new(provider_name: &str, model: &str, api_key: &str) -> Result<Self> {
        let provider = AgentFactory::create(provider_name, model, api_key)?;
        Ok(Self { provider })
    }

    /// Evaluates the current timeline state and issues an autonomous edit
    pub async fn evaluate_timeline(&self, timeline_json: &str) -> Result<Vec<AgentResponse>> {
        let prompt = format!(
            "You are the Autonomous Director for Lazynext 2025. \
            Analyze the following timeline state and determine if any edits \
            (like cutting silence, adding B-roll, or applying color grades) are needed. \
            Issue the appropriate tool calls to perform these actions automatically.\n\n\
            Timeline State:\n{}",
            timeline_json
        );

        let response = self.provider.send_prompt(&prompt).await?;
        
        match response {
            AgentResponse::Multiple(responses) => Ok(responses),
            other => Ok(vec![other]),
        }
    }
}
