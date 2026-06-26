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

pub fn can_element_go_on_track(element_type: &str, track_type: &str) -> bool {
    get_track_type_for_element_type(element_type) == track_type
}

pub struct ValidationResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
}

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
