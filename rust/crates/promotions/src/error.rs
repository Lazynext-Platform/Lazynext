use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum PromotionError {
    #[error("Coupon code not found")]
    NotFound,
    #[error("Coupon has expired")]
    Expired,
    #[error("Coupon usage limit reached")]
    UsageLimitReached,
    #[error("Invalid discount value")]
    InvalidDiscount,
}
