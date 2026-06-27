use std::ops::{Add, Div, Mul, Neg, Sub};

use bridge::export;
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};

use crate::frame_rate::FrameRate;

#[export]
pub const TICKS_PER_SECOND: i64 = 120_000;
const TICKS_PER_SECOND_F64: f64 = TICKS_PER_SECOND as f64;

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct MediaTime(i64);

impl MediaTime {
    pub const ZERO: Self = Self(0);
    pub const ONE_TICK: Self = Self(1);

    pub const fn from_ticks(ticks: i64) -> Self {
        Self(ticks)
    }

    pub const fn as_ticks(self) -> i64 {
        self.0
    }

    pub fn from_seconds_f64(seconds: f64) -> Option<Self> {
        if !seconds.is_finite() {
            return None;
        }

        let ticks = (seconds * TICKS_PER_SECOND_F64).round().to_i64()?;
        Some(Self(ticks))
    }

    pub fn to_seconds_f64(self) -> f64 {
        self.0.to_f64().unwrap_or(0.0) / TICKS_PER_SECOND_F64
    }

    pub fn from_frame(frame: i64, rate: FrameRate) -> Option<Self> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(Self(frame.checked_mul(ticks_per_frame)?))
    }

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

    pub fn to_frame_floor(self, rate: FrameRate) -> Option<i64> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(self.0.div_euclid(ticks_per_frame))
    }

    pub fn round_to_frame(self, rate: FrameRate) -> Option<Self> {
        Self::from_frame(self.to_frame_round(rate)?, rate)
    }

    pub fn floor_to_frame(self, rate: FrameRate) -> Option<Self> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(Self(self.0.div_euclid(ticks_per_frame) * ticks_per_frame))
    }

    pub fn is_frame_aligned(self, rate: FrameRate) -> Option<bool> {
        let ticks_per_frame = rate.ticks_per_frame()?;
        Some(self.0.rem_euclid(ticks_per_frame) == 0)
    }

    pub fn last_frame_time(self, rate: FrameRate) -> Option<Self> {
        if self <= Self::ZERO {
            return Some(Self::ZERO);
        }

        let last_inclusive_tick = self.0.checked_sub(1).unwrap_or(0);
        Self::from_ticks(last_inclusive_tick).floor_to_frame(rate)
    }

    pub fn snapped_seek_time(self, duration: Self, rate: FrameRate) -> Option<Self> {
        let snapped = self.round_to_frame(rate)?;
        Some(snapped.clamp(Self::ZERO, duration))
    }

    pub fn clamp(self, min: Self, max: Self) -> Self {
        Self(self.0.clamp(min.0, max.0))
    }

    pub fn min(self, other: Self) -> Self {
        Self(self.0.min(other.0))
    }

    pub fn max(self, other: Self) -> Self {
        Self(self.0.max(other.0))
    }
}

impl Add for MediaTime {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0)
    }
}

impl Sub for MediaTime {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        Self(self.0 - rhs.0)
    }
}

impl Neg for MediaTime {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self(-self.0)
    }
}

impl Mul<i64> for MediaTime {
    type Output = Self;

    fn mul(self, rhs: i64) -> Self::Output {
        Self(self.0 * rhs)
    }
}

impl Div<i64> for MediaTime {
    type Output = Self;

    fn div(self, rhs: i64) -> Self::Output {
        Self(self.0 / rhs)
    }
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeFromSecondsOptions {
    pub seconds: f64,
}

#[export]
pub fn media_time_from_seconds(
    MediaTimeFromSecondsOptions { seconds }: MediaTimeFromSecondsOptions,
) -> Option<MediaTime> {
    MediaTime::from_seconds_f64(seconds)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeToSecondsOptions {
    pub time: MediaTime,
}

#[export]
pub fn media_time_to_seconds(MediaTimeToSecondsOptions { time }: MediaTimeToSecondsOptions) -> f64 {
    time.to_seconds_f64()
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeFromFrameOptions {
    pub frame: i64,
    pub rate: FrameRate,
}

#[export]
pub fn media_time_from_frame(
    MediaTimeFromFrameOptions { frame, rate }: MediaTimeFromFrameOptions,
) -> Option<MediaTime> {
    MediaTime::from_frame(frame, rate)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeToFrameOptions {
    pub time: MediaTime,
    pub rate: FrameRate,
}

#[export]
pub fn media_time_to_frame(
    MediaTimeToFrameOptions { time, rate }: MediaTimeToFrameOptions,
) -> Option<i64> {
    time.to_frame_round(rate)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundToFrameOptions {
    pub time: MediaTime,
    pub rate: FrameRate,
}

#[export]
pub fn round_to_frame(
    RoundToFrameOptions { time, rate }: RoundToFrameOptions,
) -> Option<MediaTime> {
    time.round_to_frame(rate)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FloorToFrameOptions {
    pub time: MediaTime,
    pub rate: FrameRate,
}

#[export]
pub fn floor_to_frame(
    FloorToFrameOptions { time, rate }: FloorToFrameOptions,
) -> Option<MediaTime> {
    time.floor_to_frame(rate)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IsFrameAlignedOptions {
    pub time: MediaTime,
    pub rate: FrameRate,
}

#[export]
pub fn is_frame_aligned(
    IsFrameAlignedOptions { time, rate }: IsFrameAlignedOptions,
) -> Option<bool> {
    time.is_frame_aligned(rate)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastFrameTimeOptions {
    pub duration: MediaTime,
    pub rate: FrameRate,
}

#[export]
pub fn last_frame_time(
    LastFrameTimeOptions { duration, rate }: LastFrameTimeOptions,
) -> Option<MediaTime> {
    duration.last_frame_time(rate)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnappedSeekTimeOptions {
    pub time: MediaTime,
    pub duration: MediaTime,
    pub rate: FrameRate,
}

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

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeAddOptions {
    pub lhs: MediaTime,
    pub rhs: MediaTime,
}

#[export]
pub fn media_time_add(MediaTimeAddOptions { lhs, rhs }: MediaTimeAddOptions) -> MediaTime {
    lhs + rhs
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeSubOptions {
    pub lhs: MediaTime,
    pub rhs: MediaTime,
}

#[export]
pub fn media_time_sub(MediaTimeSubOptions { lhs, rhs }: MediaTimeSubOptions) -> MediaTime {
    lhs - rhs
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeMinOptions {
    pub lhs: MediaTime,
    pub rhs: MediaTime,
}

#[export]
pub fn media_time_min(MediaTimeMinOptions { lhs, rhs }: MediaTimeMinOptions) -> MediaTime {
    lhs.min(rhs)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeMaxOptions {
    pub lhs: MediaTime,
    pub rhs: MediaTime,
}

#[export]
pub fn media_time_max(MediaTimeMaxOptions { lhs, rhs }: MediaTimeMaxOptions) -> MediaTime {
    lhs.max(rhs)
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimeClampOptions {
    pub time: MediaTime,
    pub min: MediaTime,
    pub max: MediaTime,
}

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
