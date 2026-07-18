use crate::{Coupon, PromotionError};
use chrono::Utc;

pub struct PromotionValidator;

impl PromotionValidator {
    pub fn validate_coupon(coupon: &Coupon) -> Result<(), PromotionError> {
        // Check Expiry
        if let Some(expiry) = coupon.expires_at {
            if Utc::now() > expiry {
                return Err(PromotionError::Expired);
            }
        }

        // Check Usage Limit
        if let Some(max_uses) = coupon.max_uses {
            if coupon.current_uses >= max_uses {
                return Err(PromotionError::UsageLimitReached);
            }
        }

        // Basic sanity check
        if coupon.discount_value <= 0 {
            return Err(PromotionError::InvalidDiscount);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::DiscountType;
    use chrono::Duration;

    #[test]
    fn test_valid_coupon() {
        let coupon = Coupon::new("SAVE10".to_string(), DiscountType::Percentage, 1000);
        assert_eq!(PromotionValidator::validate_coupon(&coupon), Ok(()));
    }

    #[test]
    fn test_expired_coupon() {
        let past = Utc::now() - Duration::days(1);
        let coupon =
            Coupon::new("SAVE10".to_string(), DiscountType::Percentage, 1000).with_expiry(past);
        assert_eq!(
            PromotionValidator::validate_coupon(&coupon),
            Err(PromotionError::Expired)
        );
    }

    #[test]
    fn test_max_uses_reached() {
        let mut coupon =
            Coupon::new("SAVE10".to_string(), DiscountType::Percentage, 1000).with_max_uses(5);
        coupon.current_uses = 5;
        assert_eq!(
            PromotionValidator::validate_coupon(&coupon),
            Err(PromotionError::UsageLimitReached)
        );
    }
}
