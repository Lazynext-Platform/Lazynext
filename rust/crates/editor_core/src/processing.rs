//! Audio and video analysis utilities for the editor pipeline.
//!
//! Includes silence detection via RMS windowing, GOP-aligned lossless trimming for
//! cut-without-re-encode workflows, and frame-differencing scene change detection.

// ── Silence Detection ──

/// Detect silence regions in an audio buffer.
///
/// Returns a vector of `(start_sample, end_sample)` pairs indicating
/// where silence was detected.
///
/// # Arguments
/// * `samples` - Mono f64 audio samples (typically -1.0 to 1.0)
/// * `sample_rate` - Samples per second (e.g. 44100)
/// * `threshold_db` - Silence threshold in decibels (e.g. -40.0)
/// * `min_silence_duration_ms` - Minimum silence duration in milliseconds
pub fn extract_silence(
    samples: &[f64],
    sample_rate: u32,
    threshold_db: f64,
    min_silence_duration_ms: u32,
) -> Vec<(usize, usize)> {
    if samples.is_empty() {
        return Vec::new();
    }

    // Convert dB threshold to linear amplitude
    let threshold_linear = if threshold_db.is_finite() {
        10.0_f64.powf(threshold_db.clamp(-96.0, 0.0) / 20.0)
    } else {
        10.0_f64.powf(-40.0 / 20.0) // Default to -40dB
    };

    // Window size: 10ms worth of samples
    let window_size = (sample_rate as f64 * 0.01) as usize;
    let window_size = window_size.max(1);

    // Minimum silence windows
    let min_silence_windows = ((min_silence_duration_ms as f64 / 10.0).ceil() as usize).max(1);

    let mut silence_regions: Vec<(usize, usize)> = Vec::new();
    let mut silence_window_count = 0usize;
    let mut silence_start_sample: Option<usize> = None;
    let mut sample_offset = 0usize;

    for chunk in samples.chunks(window_size) {
        // Compute RMS amplitude for this window
        let sum_sq: f64 = chunk.iter().map(|&s| s * s).sum();
        let rms = (sum_sq / chunk.len() as f64).sqrt();

        if rms < threshold_linear {
            if silence_start_sample.is_none() {
                silence_start_sample = Some(sample_offset);
            }
            silence_window_count += 1;
        } else {
            if silence_window_count >= min_silence_windows
                && let Some(start) = silence_start_sample
            {
                silence_regions.push((start, sample_offset));
            }
            silence_start_sample = None;
            silence_window_count = 0;
        }

        sample_offset += chunk.len();
    }

    // Don't forget trailing silence
    if silence_window_count >= min_silence_windows
        && let Some(start) = silence_start_sample
    {
        silence_regions.push((start, sample_offset));
    }

    silence_regions
}

// ── GOP-Aligned Trimming ──

/// Snap trim points to nearest GOP (Group of Pictures) boundaries
/// for lossless cutting without re-encoding.
///
/// Returns `(adjusted_start, adjusted_end)` where start is snapped forward
/// to the next keyframe and end is snapped backward to the previous keyframe.
pub fn lossless_trim(start_frame: u32, end_frame: u32, gop_size: u32) -> (u32, u32) {
    let gop = gop_size.max(1);

    // Snap start forward to next keyframe boundary
    let adjusted_start = if start_frame.is_multiple_of(gop) {
        start_frame
    } else {
        start_frame + (gop - start_frame % gop)
    };

    // Snap end backward to previous keyframe boundary
    let adjusted_end = end_frame - (end_frame % gop);

    // Ensure we have at least one frame
    let adjusted_end = adjusted_end.max(adjusted_start + 1);

    (adjusted_start, adjusted_end)
}

// ── Scene Change Detection ──

/// Detect scene changes by comparing consecutive frames.
///
/// Each frame buffer is `width * height * 4` RGBA bytes.
/// Returns the frame indices where a scene cut was detected.
///
/// `threshold` should be in range [0.001, 1.0]; values outside this range
/// are clamped. `width` and `height` must be non-zero.
pub fn detect_scene_changes(
    frames: &[Vec<u8>],
    width: u32,
    height: u32,
    threshold: f64,
) -> Vec<u32> {
    if frames.len() < 2 {
        return Vec::new();
    }

    let width = width.max(1);
    let height = height.max(1);
    let threshold = threshold.clamp(0.001, 1.0);
    let pixel_count = (width as usize).checked_mul(height as usize).unwrap_or(0);
    if pixel_count == 0 {
        return Vec::new();
    }
    let stride = 4; // RGBA
    let mut cuts = Vec::new();

    for i in 1..frames.len() {
        let prev = &frames[i - 1];
        let curr = &frames[i];

        // Need at least enough bytes for the frame
        let min_len = pixel_count * stride;
        if prev.len() < min_len || curr.len() < min_len {
            continue;
        }

        let mut total_diff = 0u64;

        // Sample every 4th pixel for performance (still > 99% accurate)
        for p in (0..pixel_count).step_by(4) {
            let idx = p * stride;
            let dr = (prev[idx] as i16 - curr[idx] as i16).unsigned_abs() as u64;
            let dg = (prev[idx + 1] as i16 - curr[idx + 1] as i16).unsigned_abs() as u64;
            let db = (prev[idx + 2] as i16 - curr[idx + 2] as i16).unsigned_abs() as u64;
            total_diff += dr + dg + db;
        }

        let samples = pixel_count / 4;
        let max_diff_per_pixel = 255 * 3; // RGB
        let normalized = total_diff as f64 / (samples as f64 * max_diff_per_pixel as f64);

        if normalized > threshold {
            cuts.push(i as u32);
        }
    }

    cuts
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::TAU;

    #[test]
    fn test_extract_silence_empty() {
        let result = extract_silence(&[], 44100, -40.0, 500);
        assert!(result.is_empty());
    }

    #[test]
    fn test_extract_silence_all_silence() {
        let samples = vec![0.0; 44100]; // 1 second of silence at 44.1kHz
        let result = extract_silence(&samples, 44100, -40.0, 500);
        assert!(!result.is_empty());
        let (start, end) = result[0];
        assert_eq!(start, 0);
        assert!(end > 40000); // should cover most of the buffer
    }

    #[test]
    fn test_extract_silence_loud_signal() {
        // Generate a sine wave at -6dB
        let sample_rate = 44100;
        let freq = 440.0;
        let amplitude = 0.5; // -6dB
        let samples: Vec<f64> = (0..sample_rate)
            .map(|i| amplitude * (TAU * freq * i as f64 / sample_rate as f64).sin())
            .collect();
        let result = extract_silence(&samples, sample_rate, -40.0, 500);
        assert!(
            result.is_empty(),
            "Loud signal should not trigger silence detection"
        );
    }

    #[test]
    fn test_lossless_trim_aligned() {
        let (start, end) = lossless_trim(0, 30, 30);
        assert_eq!(start, 0);
        assert_eq!(end, 30);
    }

    #[test]
    fn test_lossless_trim_snap() {
        // Start at 14 should snap to 30, end at 75 should snap to 60
        let (start, end) = lossless_trim(14, 75, 30);
        assert_eq!(start, 30);
        assert_eq!(end, 60);
    }

    #[test]
    fn test_lossless_trim_minimum_one_frame() {
        let (start, end) = lossless_trim(0, 0, 30);
        assert!(end > start, "Should have at least one frame gap");
    }

    #[test]
    fn test_detect_scene_changes_no_change() {
        let frame = vec![128u8; 640 * 480 * 4];
        let frames = vec![frame.clone(), frame.clone(), frame];
        let cuts = detect_scene_changes(&frames, 640, 480, 0.1);
        // Identical frames should have near-zero difference
        assert!(cuts.is_empty());
    }

    #[test]
    fn test_detect_scene_changes_dramatic() {
        let frame_a = vec![0u8; 640 * 480 * 4];
        let frame_b = vec![255u8; 640 * 480 * 4];
        let frames = vec![frame_a, frame_b];
        let cuts = detect_scene_changes(&frames, 640, 480, 0.1);
        assert_eq!(cuts.len(), 1);
        assert_eq!(cuts[0], 1);
    }

    #[test]
    fn test_detect_scene_changes_too_few_frames() {
        let frame = vec![0u8; 640 * 480 * 4];
        let frames = vec![frame];
        let cuts = detect_scene_changes(&frames, 640, 480, 0.1);
        assert!(cuts.is_empty());
    }
}
