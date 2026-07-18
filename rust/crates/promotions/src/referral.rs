use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReferralStatus {
    Pending,
    Converted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Referral {
    pub id: Uuid,
    pub referrer_id: String,
    pub referred_id: String,
    pub status: ReferralStatus,
    pub reward_granted: bool,
    pub created_at: DateTime<Utc>,
}

impl Referral {
    pub fn new(referrer_id: String, referred_id: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            referrer_id,
            referred_id,
            status: ReferralStatus::Pending,
            reward_granted: false,
            created_at: Utc::now(),
        }
    }

    pub fn convert(&mut self) {
        self.status = ReferralStatus::Converted;
    }

    pub fn grant_reward(&mut self) {
        self.reward_granted = true;
    }
}
