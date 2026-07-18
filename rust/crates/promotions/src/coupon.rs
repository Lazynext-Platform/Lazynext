use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DiscountType {
    Percentage,
    Fixed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coupon {
    pub id: Uuid,
    pub code: String,
    pub discount_type: DiscountType,
    pub discount_value: i32, // Stored as integer: percentage * 100 or cents
    pub max_uses: Option<i32>,
    pub current_uses: i32,
    pub expires_at: Option<DateTime<Utc>>,
}

impl Coupon {
    pub fn new(code: String, discount_type: DiscountType, discount_value: i32) -> Self {
        Self {
            id: Uuid::new_v4(),
            code,
            discount_type,
            discount_value,
            max_uses: None,
            current_uses: 0,
            expires_at: None,
        }
    }

    pub fn with_expiry(mut self, expires_at: DateTime<Utc>) -> Self {
        self.expires_at = Some(expires_at);
        self
    }

    pub fn with_max_uses(mut self, max_uses: i32) -> Self {
        self.max_uses = Some(max_uses);
        self
    }
}
