//! Element-to-track type compatibility mapping and validation.
//! Determines which track type a given element belongs on and
//! validates that placements are compatible.

/// Maps an element type to the track type it belongs on.
/// e.g. "audio" → "audio", "image" → "video", "sticker" → "graphic".
pub fn get_track_type_for_element_type(element_type: &str) -> &'static str {
    match element_type {
        "audio" => "audio",
        "text" => "text",
        "sticker" => "graphic",
        "graphic" => "graphic",
        "effect" => "effect",
        "video" => "video",
        "image" => "video",
        _ => "video", // Default fallback
    }
}

/// Returns true if an element of the given type can be placed on a track
/// of the given type.
pub fn can_element_go_on_track(element_type: &str, track_type: &str) -> bool {
    get_track_type_for_element_type(element_type) == track_type
}

/// The result of validating whether an element type is compatible with a
/// track type.
pub struct ValidationResult {
    /// Whether the element/track combination is valid.
    pub is_valid: bool,
    /// Description of the incompatibility, if any.
    pub error_message: Option<String>,
}

/// Validates that an element type is compatible with the given track type,
/// returning a `ValidationResult` with error details on mismatch.
pub fn validate_element_track_compatibility(
    element_type: &str,
    track_type: &str,
) -> ValidationResult {
    let is_valid = can_element_go_on_track(element_type, track_type);

    if !is_valid {
        return ValidationResult {
            is_valid: false,
            error_message: Some(format!(
                "{} elements cannot be placed on {} tracks",
                element_type, track_type
            )),
        };
    }

    ValidationResult {
        is_valid: true,
        error_message: None,
    }
}
