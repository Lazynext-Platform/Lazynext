//! Keyframe interpolation engine.
//!
//! Defines cubic Bezier easing curves (ease-in, ease-out, ease-in-out,
//! linear) and an `Interpolator` that computes property values at any
//! point in time between sorted keyframes.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BezierCurve {
    pub p0: f32, // start control point
    pub p1: f32, // p1 control point
    pub p2: f32, // p2 control point
    pub p3: f32, // end control point
}

impl BezierCurve {
    /// Ease In Out
    pub fn ease_in_out() -> Self {
        Self {
            p0: 0.0,
            p1: 0.42,
            p2: 0.58,
            p3: 1.0,
        }
    }

    /// Ease In
    pub fn ease_in() -> Self {
        Self {
            p0: 0.0,
            p1: 0.42,
            p2: 1.0,
            p3: 1.0,
        }
    }

    /// Ease Out
    pub fn ease_out() -> Self {
        Self {
            p0: 0.0,
            p1: 0.0,
            p2: 0.58,
            p3: 1.0,
        }
    }

    /// Linear
    pub fn linear() -> Self {
        Self {
            p0: 0.0,
            p1: 0.0,
            p2: 1.0,
            p3: 1.0,
        }
    }

    /// Calculate cubic bezier value at normalized time t (0.0 to 1.0)
    pub fn sample(&self, t: f32) -> f32 {
        let t = t.clamp(0.0, 1.0);
        let mt = 1.0 - t;

        let mt3 = mt * mt * mt;
        let mt2_t = 3.0 * mt * mt * t;
        let mt_t2 = 3.0 * mt * t * t;
        let t3 = t * t * t;

        mt3 * self.p0 + mt2_t * self.p1 + mt_t2 * self.p2 + t3 * self.p3
    }
}

/// A single keyframe at a given time with a property value and easing curve.
#[derive(Debug, Clone, PartialEq)]
pub struct Keyframe {
    pub time: f32,  // Absolute time in seconds
    pub value: f32, // Property value
    pub curve: BezierCurve,
}

/// Stateless interpolator that computes property values between keyframes.
pub struct Interpolator;

impl Interpolator {
    /// Interpolate between a sorted array of keyframes for a specific given time.
    pub fn interpolate(keyframes: &[Keyframe], time: f32) -> f32 {
        if keyframes.is_empty() {
            return 0.0;
        }
        if keyframes.len() == 1 {
            return keyframes[0].value;
        }

        if time <= keyframes.first().unwrap().time {
            return keyframes.first().unwrap().value;
        }
        if time >= keyframes.last().unwrap().time {
            return keyframes.last().unwrap().value;
        }

        // Find surrounding keyframes
        let mut start_kf = &keyframes[0];
        let mut end_kf = &keyframes[1];

        for i in 0..keyframes.len() - 1 {
            if time >= keyframes[i].time && time <= keyframes[i + 1].time {
                start_kf = &keyframes[i];
                end_kf = &keyframes[i + 1];
                break;
            }
        }

        let duration = end_kf.time - start_kf.time;
        if duration == 0.0 {
            return end_kf.value;
        }

        let normalized_time = (time - start_kf.time) / duration;
        let eased_time = start_kf.curve.sample(normalized_time);

        start_kf.value + (end_kf.value - start_kf.value) * eased_time
    }
}
