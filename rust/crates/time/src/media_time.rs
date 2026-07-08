//! High-precision media time in 120,000 ticks per second.
//!
//! `MediaTime` is the single source of truth for all temporal
//! operations: frame alignment, snapping, clamping, arithmetic,
//! and bidirectional conversion with [`FrameRate`]. Free functions
//! are exported to the WASM bridge for frontend consumption.

use std::ops::{Add, Div, Mul, Neg, Sub};

use bridge::export;
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};

use crate::frame_rate::FrameRate;

/// Number of internal time ticks per second (120,000 — divisible by all
/// common frame rates and audio sample rates for exact frame alignment).
#[export]
pub const TICKS_PER_SECOND: i64 = 120_000;
const TICKS_PER_SECOND_F64: f64 = TICKS_PER_SECOND as f64;

/// A point (or duration) in media time, stored as an integer count of
/// [`TICKS_PER_SECOND`] ticks for exact, drift-free arithmetic.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct MediaTime(i64);

impl MediaTime {
    /// Zero time (the timeline origin).
    pub const ZERO: Self = Self(0);
    /// The smallest representable positive time (one tick).
    pub const ONE_TICK: Self = Self(1);

    /// Constructs a `MediaTime` from a raw tick count.
    pub const fn from_ticks(ticks: i64) -> Self {
        Self(ticks)
    }

    /// Returns the raw tick count.
    pub const fn as_ticks(self) -> i64 {
        self.0
    }

    /// Converts floating-point seconds to `MediaTime`, rounding to the
    /// nearest tick. Returns `None` for non-finite or out-of-range inputs.
    pub fn from_seconds_f64(seconds: f64) -> Option<Self> {
        if !seconds.is_finite() {
            return None;
        }

        let ticks = (seconds * TICKS_PER_SECOND_F64).round().to_i64()?;
        Some(Self(ticks))
    }

    /// Converts this time to floating-point seconds.
    pub fn to_seconds_f64(self) -> f64 {
        self.0.to_f64().unwrap_or(0.0) / TICKS_PER_SECOND_F64
    }

    /// Builds a `MediaTime` from a frame index at the given rate. Returns
    /// `None` if the rate is invalid or the result overflows.
    pub fn from_frame(frame: i64, rate: FrameRate) -> Option<Self> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(Self(frame.checked_mul(ticks_per_frame)?))
    }

    /// Returns the nearest frame index at the given rate (round half up).
    pub fn to_frame_round(self, rate: FrameRate) -> Option<i64> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        let remainder = self.0.rem_euclid(ticks_per_frame);
        let floor = self.0.div_euclid(ticks_per_frame);
        if remainder * 2 >= ticks_per_frame {
            Some(floor + 1)
        } else {
            Some(floor)
        }
    }

    /// Returns the frame index containing this time (round down).
    pub fn to_frame_floor(self, rate: FrameRate) -> Option<i64> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(self.0.div_euclid(ticks_per_frame))
    }

    /// Snaps this time to the nearest frame-aligned `MediaTime`.
    pub fn round_to_frame(self, rate: FrameRate) -> Option<Self> {
        Self::from_frame(self.to_frame_round(rate)?, rate)
    }

    /// Snaps this time down to the start of its containing frame.
    pub fn floor_to_frame(self, rate: FrameRate) -> Option<Self> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(Self(self.0.div_euclid(ticks_per_frame) * ticks_per_frame))
    }

    /// Returns whether this time falls exactly on a frame boundary.
    pub fn is_frame_aligned(self, rate: FrameRate) -> Option<bool> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(self.0.rem_euclid(ticks_per_frame) == 0)
    }

    /// Returns the start time of the last full frame that fits within `self`
    /// treated as a duration (clamped to `ZERO`).
    pub fn last_frame_time(self, rate: FrameRate) -> Option<Self> {
        if self <= Self::ZERO {
            return Some(Self::ZERO);
        }

        let last_inclusive_tick = self.0.checked_sub(1).unwrap_or(0);
        Self::from_ticks(last_inclusive_tick).floor_to_frame(rate)
    }

    /// Rounds this seek time to the nearest frame and clamps it within
    /// `[ZERO, duration]`.
    pub fn snapped_seek_time(self, duration: Self, rate: FrameRate) -> Option<Self> {
        let snapped = self.round_to_frame(rate)?;
        Some(snapped.clamp(Self::ZERO, duration))
    }

    /// Clamps this time to the inclusive range `[min, max]`.
    pub fn clamp(self, min: Self, max: Self) -> Self {
        Self(self.0.clamp(min.0, max.0))
    }

    /// Returns the smaller of `self` and `other`.
    pub fn min(self, other: Self) -> Self {
        Self(self.0.min(other.0))
    }

    /// Returns the larger of `self` and `other`.
    pub fn max(self, other: Self) -> Self {
        Self(self.0.max(other.0))
    }
}

impl Add for MediaTime {
    type Output = Self;

    // Adds two media-time values.
    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0)
    }
}

impl Sub for MediaTime {
    type Output = Self;

    // Subtracts one media-time value from another.
    fn sub(self, rhs: Self) -> Self::Output {
        Self(self.0 - rhs.0)
    }
}

impl Neg for MediaTime {
    type Output = Self;

    // Negates a media-time value.
    fn neg(self) -> Self::Output {
        Self(-self.0)
    }
}

impl Mul<i64> for MediaTime {
    type Output = Self;

    // Multiplies a media-time value by an integer scalar.
    fn mul(self, rhs: i64) -> Self::Output {
        Self(self.0 * rhs)
    }
}

impl Div<i64> for MediaTime {
    type Output = Self;

    // Divides a media-time value by an integer scalar.
    fn div(self, rhs: i64) -> Self::Output {
        Self(self.0 / rhs)
    }
}

/// WASM-ABI input options for converting seconds to `MediaTime`.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeFromSecondsOptions {
    /// Time value in floating-point seconds.
    pub seconds: f64,
}

/// Converts floating-point seconds to a `MediaTime`, returning `None` for non-finite inputs.
#[export]
pub fn media_time_from_seconds(
    MediaTimeFromSecondsOptions { seconds }: MediaTimeFromSecondsOptions,
) -> Option<MediaTime> {
    MediaTime::from_seconds_f64(seconds)
}

/// WASM-ABI input options for converting `MediaTime` to seconds.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeToSecondsOptions {
    /// Media time to convert to seconds.
    pub time: MediaTime,
}

/// Converts a `MediaTime` to floating-point seconds.
#[export]
pub fn media_time_to_seconds(MediaTimeToSecondsOptions { time }: MediaTimeToSecondsOptions) -> f64 {
    time.to_seconds_f64()
}

/// WASM-ABI input options for creating a `MediaTime` from a frame number and rate.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeFromFrameOptions {
    /// Frame index to convert.
    pub frame: i64,
    /// Frame rate used for the conversion.
    pub rate: FrameRate,
}

/// Converts a frame number at the given rate to a `MediaTime`.
#[export]
pub fn media_time_from_frame(
    MediaTimeFromFrameOptions { frame, rate }: MediaTimeFromFrameOptions,
) -> Option<MediaTime> {
    MediaTime::from_frame(frame, rate)
}

/// WASM-ABI input options for rounding a `MediaTime` to the nearest frame.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeToFrameOptions {
    /// Media time to convert to a frame index.
    pub time: MediaTime,
    /// Frame rate used for the conversion.
    pub rate: FrameRate,
}

/// Rounds a `MediaTime` to the nearest frame index at the given rate.
#[export]
pub fn media_time_to_frame(
    MediaTimeToFrameOptions { time, rate }: MediaTimeToFrameOptions,
) -> Option<i64> {
    time.to_frame_round(rate)
}

/// WASM-ABI input options for rounding a `MediaTime` to the nearest frame boundary.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundToFrameOptions {
    /// Media time to round.
    pub time: MediaTime,
    /// Frame rate defining the frame boundaries.
    pub rate: FrameRate,
}

/// Rounds a `MediaTime` to the nearest frame-aligned time.
#[export]
pub fn round_to_frame(
    RoundToFrameOptions { time, rate }: RoundToFrameOptions,
) -> Option<MediaTime> {
    time.round_to_frame(rate)
}

/// WASM-ABI input options for flooring a `MediaTime` to a frame boundary.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FloorToFrameOptions {
    /// Media time to floor.
    pub time: MediaTime,
    /// Frame rate defining the frame boundaries.
    pub rate: FrameRate,
}

/// Floors a `MediaTime` down to the previous frame boundary.
#[export]
pub fn floor_to_frame(
    FloorToFrameOptions { time, rate }: FloorToFrameOptions,
) -> Option<MediaTime> {
    time.floor_to_frame(rate)
}

/// WASM-ABI input options for checking frame alignment.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IsFrameAlignedOptions {
    /// Media time to test for frame alignment.
    pub time: MediaTime,
    /// Frame rate defining the frame boundaries.
    pub rate: FrameRate,
}

/// Returns `true` if the `MediaTime` is exactly aligned to a frame boundary.
#[export]
pub fn is_frame_aligned(
    IsFrameAlignedOptions { time, rate }: IsFrameAlignedOptions,
) -> Option<bool> {
    time.is_frame_aligned(rate)
}

/// WASM-ABI input options for computing the last frame time within a duration.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastFrameTimeOptions {
    /// Duration within which to find the last full frame.
    pub duration: MediaTime,
    /// Frame rate defining the frame boundaries.
    pub rate: FrameRate,
}

/// Returns the start time of the last full frame within a duration.
#[export]
pub fn last_frame_time(
    LastFrameTimeOptions { duration, rate }: LastFrameTimeOptions,
) -> Option<MediaTime> {
    duration.last_frame_time(rate)
}

/// WASM-ABI input options for computing a snapped seek time.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnappedSeekTimeOptions {
    /// Requested seek time.
    pub time: MediaTime,
    /// Total duration used to clamp the result.
    pub duration: MediaTime,
    /// Frame rate defining the frame boundaries.
    pub rate: FrameRate,
}

/// Rounds a seek time to the nearest frame and clamps it within `[0, duration]`.
#[export]
pub fn snapped_seek_time(
    SnappedSeekTimeOptions {
        time,
        duration,
        rate,
    }: SnappedSeekTimeOptions,
) -> Option<MediaTime> {
    time.snapped_seek_time(duration, rate)
}

/// WASM-ABI input options for adding two `MediaTime` values.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeAddOptions {
    /// Left-hand operand.
    pub lhs: MediaTime,
    /// Right-hand operand.
    pub rhs: MediaTime,
}

/// Adds two `MediaTime` values. Exported for the WASM bridge.
#[export]
pub fn media_time_add(MediaTimeAddOptions { lhs, rhs }: MediaTimeAddOptions) -> MediaTime {
    lhs + rhs
}

/// WASM-ABI input options for subtracting two `MediaTime` values.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeSubOptions {
    /// Left-hand operand (minuend).
    pub lhs: MediaTime,
    /// Right-hand operand (subtrahend).
    pub rhs: MediaTime,
}

/// Subtracts `rhs` from `lhs` and returns the result.
#[export]
pub fn media_time_sub(MediaTimeSubOptions { lhs, rhs }: MediaTimeSubOptions) -> MediaTime {
    lhs - rhs
}

/// WASM-ABI input options for the minimum of two `MediaTime` values.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeMinOptions {
    /// Left-hand operand.
    pub lhs: MediaTime,
    /// Right-hand operand.
    pub rhs: MediaTime,
}

/// Returns the smaller of two `MediaTime` values.
#[export]
pub fn media_time_min(MediaTimeMinOptions { lhs, rhs }: MediaTimeMinOptions) -> MediaTime {
    lhs.min(rhs)
}

/// WASM-ABI input options for the maximum of two `MediaTime` values.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeMaxOptions {
    /// Left-hand operand.
    pub lhs: MediaTime,
    /// Right-hand operand.
    pub rhs: MediaTime,
}

/// Returns the larger of two `MediaTime` values.
#[export]
pub fn media_time_max(MediaTimeMaxOptions { lhs, rhs }: MediaTimeMaxOptions) -> MediaTime {
    lhs.max(rhs)
}

/// WASM-ABI input options for clamping a `MediaTime` between min and max.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeClampOptions {
    /// Media time to clamp.
    pub time: MediaTime,
    /// Inclusive lower bound.
    pub min: MediaTime,
    /// Inclusive upper bound.
    pub max: MediaTime,
}

/// Clamps a `MediaTime` to the inclusive range `[min, max]`.
#[export]
pub fn media_time_clamp(
    MediaTimeClampOptions { time, min, max }: MediaTimeClampOptions,
) -> MediaTime {
    time.clamp(min, max)
}

#[cfg(test)]
mod tests {
    use crate::frame_rate::FrameRate;

    use super::{
        MediaTime, MediaTimeFromSecondsOptions, MediaTimeToSecondsOptions, TICKS_PER_SECOND,
        media_time_from_seconds, media_time_to_seconds,
    };

    #[test]
    fn converts_between_seconds_and_ticks() {
        assert_eq!(
            MediaTime::from_seconds_f64(1.5),
            Some(MediaTime::from_ticks(180_000))
        );
        assert_eq!(MediaTime::from_ticks(180_000).to_seconds_f64(), 1.5);
        assert_eq!(TICKS_PER_SECOND, 120_000);
    }

    #[test]
    fn rejects_non_finite_seconds() {
        assert_eq!(MediaTime::from_seconds_f64(f64::NAN), None);
        assert_eq!(MediaTime::from_seconds_f64(f64::INFINITY), None);
        assert_eq!(MediaTime::from_seconds_f64(f64::NEG_INFINITY), None);
    }

    #[test]
    fn snaps_to_the_nearest_frame() {
        let rate = FrameRate::FPS_30;
        let time = MediaTime::from_seconds_f64(1.26).unwrap();

        assert_eq!(time.to_frame_round(rate), Some(38));
        assert_eq!(
            time.round_to_frame(rate),
            Some(MediaTime::from_ticks(152_000))
        );
    }

    #[test]
    fn floors_to_frame() {
        let rate = FrameRate::FPS_30;
        let ticks_per_frame = 4_000;
        let time = MediaTime::from_ticks(ticks_per_frame * 5 + 1);

        assert_eq!(time.to_frame_floor(rate), Some(5));
        assert_eq!(time.to_frame_round(rate), Some(5));

        let almost_next = MediaTime::from_ticks(ticks_per_frame * 5 + ticks_per_frame / 2);
        assert_eq!(almost_next.to_frame_floor(rate), Some(5));
        assert_eq!(almost_next.to_frame_round(rate), Some(6));
    }

    #[test]
    fn computes_last_frame_time_and_snapped_seek_time() {
        let rate = FrameRate::new(5, 1);
        let duration = MediaTime::from_seconds_f64(10.0).unwrap();

        assert_eq!(
            duration.last_frame_time(rate),
            Some(MediaTime::from_seconds_f64(9.8).unwrap()),
        );
        assert_eq!(
            MediaTime::from_seconds_f64(10.0)
                .unwrap()
                .snapped_seek_time(duration, rate),
            Some(MediaTime::from_seconds_f64(10.0).unwrap()),
        );
    }

    #[test]
    fn media_time_from_seconds_roundtrip_via_free_functions() {
        // Test the exported free functions roundtrip
        let test_values = [0.0, 0.5, 1.0, 2.75, 60.0, 3600.0, 0.001, 0.008333333];
        for &secs in &test_values {
            let time = media_time_from_seconds(MediaTimeFromSecondsOptions { seconds: secs })
                .expect("valid seconds should produce a MediaTime");
            let roundtrip = media_time_to_seconds(MediaTimeToSecondsOptions { time });
            let diff = (roundtrip - secs).abs();
            assert!(
                diff < 1.0 / TICKS_PER_SECOND as f64,
                "Roundtrip failed for {secs}: got {roundtrip}, diff {diff}"
            );
        }
    }

    #[test]
    fn media_time_from_seconds_zero_is_exact() {
        let time = media_time_from_seconds(MediaTimeFromSecondsOptions { seconds: 0.0 })
            .expect("zero seconds should produce a MediaTime");
        assert_eq!(time, MediaTime::ZERO);
        assert_eq!(time.as_ticks(), 0);
        let roundtrip = media_time_to_seconds(MediaTimeToSecondsOptions { time });
        assert_eq!(roundtrip, 0.0);
    }

    #[test]
    fn media_time_from_seconds_sub_tick_precision() {
        // Values smaller than one tick should round to the nearest tick
        let one_tick_seconds = 1.0 / TICKS_PER_SECOND as f64; // ~0.000008333 seconds
        let tiny = one_tick_seconds * 0.4;
        let time_tiny = media_time_from_seconds(MediaTimeFromSecondsOptions { seconds: tiny })
            .expect("tiny seconds should produce a MediaTime");
        // Should round to 0 ticks
        assert_eq!(time_tiny.as_ticks(), 0);

        let half_tick = one_tick_seconds * 0.6;
        let time_half = media_time_from_seconds(MediaTimeFromSecondsOptions { seconds: half_tick })
            .expect("half tick seconds should produce a MediaTime");
        // Should round to 1 tick (nearest integer after scaling)
        assert_eq!(time_half.as_ticks(), 1);

        // Verify roundtrip for exactly one tick
        let one_tick = media_time_from_seconds(MediaTimeFromSecondsOptions {
            seconds: one_tick_seconds,
        })
        .expect("one tick seconds should produce a MediaTime");
        assert_eq!(one_tick.as_ticks(), 1);
        let roundtrip = media_time_to_seconds(MediaTimeToSecondsOptions { time: one_tick });
        let diff = (roundtrip - one_tick_seconds).abs();
        assert!(diff < 1e-10);
    }

    #[test]
    fn test_add_media_times() {
        let a = MediaTime::from_seconds_f64(5.0).unwrap();
        let b = MediaTime::from_seconds_f64(3.0).unwrap();
        let sum = a + b;
        assert!((sum.to_seconds_f64() - 8.0).abs() < 0.01);
    }

    #[test]
    fn test_sub_media_times() {
        let a = MediaTime::from_seconds_f64(10.0).unwrap();
        let b = MediaTime::from_seconds_f64(3.0).unwrap();
        let diff = a - b;
        assert!((diff.to_seconds_f64() - 7.0).abs() < 0.01);
    }

    #[test]
    fn test_clamp_media_time() {
        let min = MediaTime::from_seconds_f64(0.0).unwrap();
        let max = MediaTime::from_seconds_f64(10.0).unwrap();
        let inside = MediaTime::from_seconds_f64(5.0).unwrap();
        let below = MediaTime::from_seconds_f64(-1.0).unwrap();
        let above = MediaTime::from_seconds_f64(20.0).unwrap();

        assert_eq!(inside.clamp(min, max).to_seconds_f64(), 5.0);
        assert_eq!(below.clamp(min, max).to_seconds_f64(), 0.0);
        assert_eq!(above.clamp(min, max).to_seconds_f64(), 10.0);
    }

    #[test]
    fn test_is_frame_aligned() {
        let rate = FrameRate::FPS_30;
        let aligned = MediaTime::from_frame(30, rate).unwrap();
        assert!(aligned.is_frame_aligned(rate).unwrap());
        // A non-aligned time should return false
        let misaligned = MediaTime::from_ticks(1);
        assert!(!misaligned.is_frame_aligned(rate).unwrap());
    }

    #[test]
    fn media_time_from_seconds_roundtrip_struct_method() {
        let test_values = [0.0, 0.5, 1.0, 2.75, 60.0, 3600.0, 0.001, 0.008333333];
        for &secs in &test_values {
            let time = MediaTime::from_seconds_f64(secs)
                .expect("valid seconds should produce a MediaTime");
            let roundtrip = time.to_seconds_f64();
            let diff = (roundtrip - secs).abs();
            assert!(
                diff < 1.0 / TICKS_PER_SECOND as f64,
                "Roundtrip failed for {secs}: got {roundtrip}, diff {diff}"
            );
        }
    }

    #[test]
    fn media_time_from_frame_roundtrip() {
        let rate = FrameRate::FPS_30;
        for frame in [0, 1, 42, 100, 999] {
            let time =
                MediaTime::from_frame(frame, rate).expect("valid frame should produce a MediaTime");
            let roundtrip = time
                .to_frame_round(rate)
                .expect("valid time should round to frame");
            assert_eq!(roundtrip, frame, "Frame roundtrip failed for frame {frame}");
        }
    }

    #[test]
    fn snapped_seek_time_snaps_to_frame_boundaries() {
        let rate = FrameRate::FPS_30;
        let duration = MediaTime::from_seconds_f64(10.0).unwrap();
        // A time between frames should snap to the nearest frame
        let between_frames = MediaTime::from_seconds_f64(1.267).unwrap();
        let snapped = between_frames.snapped_seek_time(duration, rate).unwrap();
        assert!(
            snapped.is_frame_aligned(rate).unwrap(),
            "snapped_seek_time should produce a frame-aligned time, got ticks {}",
            snapped.as_ticks()
        );
        // snapped should be clamped within [ZERO, duration]
        assert!(snapped >= MediaTime::ZERO);
        assert!(snapped <= duration);
    }

    #[test]
    fn snapped_seek_time_clamps_below_zero() {
        let rate = FrameRate::FPS_30;
        let duration = MediaTime::from_seconds_f64(5.0).unwrap();
        let negative = MediaTime::from_seconds_f64(-1.0).unwrap();
        let snapped = negative.snapped_seek_time(duration, rate).unwrap();
        assert_eq!(snapped, MediaTime::ZERO);
    }

    #[test]
    fn snapped_seek_time_exact_frame_stays_unchanged() {
        let rate = FrameRate::FPS_30;
        let duration = MediaTime::from_seconds_f64(30.0).unwrap();
        // An exact frame time should remain unchanged after snapping
        let exact = MediaTime::from_frame(45, rate).unwrap();
        let snapped = exact.snapped_seek_time(duration, rate).unwrap();
        assert_eq!(snapped, exact);
    }

    #[test]
    fn arithmetic_add_sub() {
        let a = MediaTime::from_seconds_f64(1.0).unwrap();
        let b = MediaTime::from_seconds_f64(2.5).unwrap();
        let sum = a + b;
        assert_eq!(sum.to_seconds_f64(), 3.5);
        let diff = b - a;
        assert_eq!(diff.to_seconds_f64(), 1.5);
        let neg = -a;
        assert_eq!(neg.to_seconds_f64(), -1.0);
        let scaled = a * 3;
        assert_eq!(scaled.to_seconds_f64(), 3.0);
        let divided = b / 5;
        assert_eq!(divided.to_seconds_f64(), 0.5);
    }

    #[test]
    fn arithmetic_add_sub_identity() {
        let x = MediaTime::from_seconds_f64(42.0).unwrap();
        assert_eq!(x + MediaTime::ZERO, x);
        assert_eq!(x - MediaTime::ZERO, x);
        assert_eq!(x - x, MediaTime::ZERO);
    }
}
