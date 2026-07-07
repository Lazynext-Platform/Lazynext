//! Integration tests for the SAM2 rotoscoping mask engine.
//!
//! Verifies engine initialization, point-based mask generation,
//! empty-click handling, and bounding-box mask delegation.

use masks::{BoundingBox, Coordinate, Sam2MaskEngine};

#[test]
fn test_sam2_engine_initializes() {
    let engine = Sam2MaskEngine::new();
    assert!(engine.is_model_loaded);
}

#[test]
fn test_generate_mask_from_points_returns_valid_dimensions() {
    let engine = Sam2MaskEngine::new();
    let width = 100u32;
    let height = 80u32;
    let frame_data = vec![0u8; (width * height * 4) as usize];

    let mask = engine.generate_mask_from_points(
        &frame_data,
        width,
        height,
        &[Coordinate { x: 50.0, y: 40.0 }],
        &[],
    );

    assert_eq!(mask.width, width);
    assert_eq!(mask.height, height);
    assert_eq!(mask.data.len(), (width * height) as usize);
    // Mask should have some non-zero values (the circle)
    let has_content = mask.data.iter().any(|&v| v > 0);
    assert!(
        has_content,
        "Mask should have non-zero pixels for positive click"
    );
}

#[test]
fn test_generate_mask_empty_clicks_returns_mask() {
    let engine = Sam2MaskEngine::new();
    let width = 100u32;
    let height = 80u32;
    let frame_data = vec![0u8; (width * height * 4) as usize];

    let mask = engine.generate_mask_from_points(&frame_data, width, height, &[], &[]);

    assert_eq!(mask.width, width);
    assert_eq!(mask.height, height);
    assert_eq!(mask.data.len(), (width * height) as usize);
}

#[test]
fn test_generate_mask_from_box_delegates() {
    let engine = Sam2MaskEngine::new();
    let width = 100u32;
    let height = 80u32;
    let frame_data = vec![0u8; (width * height * 4) as usize];

    let bbox = BoundingBox {
        x_min: 10.0,
        y_min: 10.0,
        x_max: 90.0,
        y_max: 70.0,
    };

    let mask = engine.generate_mask_from_box(&frame_data, width, height, &bbox);
    assert_eq!(mask.width, width);
    assert_eq!(mask.height, height);
}
