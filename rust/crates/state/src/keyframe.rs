//! Keyframe animation system for interpolating timeline properties.
//!
//! Provides a typed keyframe abstraction with configurable easing curves
//! (linear, step, cubic bezier, and custom bezier handles) and a scalar
//! animation channel that evaluates interpolated values at arbitrary frame
//! positions. Intended to be the Rust implementation backing the TypeScript
//! keyframe utilities in the web shell via WASM.

use serde::{Deserialize, Serialize};

/// Easing functions for keyframe interpolation.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[allow(clippy::large_enum_variant)]
#[derive(Default)]
pub enum Easing {
    #[default]
    Linear,
    Step,
    EaseIn,
    EaseOut,
    EaseInOut,
    CubicBezier {
        x1: f64,
        y1: f64,
        x2: f64,
        y2: f64,
    },
    Bezier {
        right_dt: f64,
        right_dv: f64,
        left_dt: f64,
        left_dv: f64,
    },
}

/// A single keyframe with a frame position and typed value.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Keyframe<T> {
    pub frame: u32,
    pub value: T,
    #[serde(default)]
    pub easing: Easing,
}

impl<T> Keyframe<T> {
    /// Create a new keyframe at the given frame with an easing curve.
    pub fn new(frame: u32, value: T, easing: Easing) -> Self {
        Self {
            frame,
            value,
            easing,
        }
    }
}

/// A scalar animation channel that interpolates f64 values across keyframes.
///
/// This is the Rust equivalent of the TypeScript keyframe interpolation in
/// `apps/web/src/components/editor/keyframe-utils.ts`. The web shell delegates
/// keyframe evaluation to WASM once this is exposed via the bridge.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ScalarAnimationChannel {
    keyframes: Vec<Keyframe<f64>>,
}

impl ScalarAnimationChannel {
    pub fn new() -> Self {
        Self {
            keyframes: Vec::new(),
        }
    }

    /// Add a keyframe. Keyframes are kept sorted by frame number.
    pub fn add_keyframe(&mut self, frame: u32, value: f64, easing: Easing) {
        let kf = Keyframe::new(frame, value, easing);
        let pos = self
            .keyframes
            .binary_search_by(|k| k.frame.cmp(&frame))
            .unwrap_or_else(|e| e);
        self.keyframes.insert(pos, kf);
    }

    /// Evaluate the channel's value at a given frame.
    ///
    /// Returns `default_value` if there are no keyframes.
    pub fn evaluate_at(&self, frame: u32, default_value: f64) -> f64 {
        if self.keyframes.is_empty() {
            return default_value;
        }

        // Before first keyframe
        if frame <= self.keyframes[0].frame {
            return self.keyframes[0].value;
        }

        // After last keyframe
        let last = &self.keyframes[self.keyframes.len() - 1];
        if frame >= last.frame {
            return last.value;
        }

        // Between two keyframes
        for i in 0..self.keyframes.len() - 1 {
            let k1 = &self.keyframes[i];
            let k2 = &self.keyframes[i + 1];
            if frame >= k1.frame && frame < k2.frame {
                if k1.easing == Easing::Step {
                    return k1.value;
                }

                let range = (k2.frame - k1.frame) as f64;
                if range == 0.0 {
                    return k1.value;
                }

                let t = (frame - k1.frame) as f64 / range;

                // Apply easing
                match &k1.easing {
                    Easing::Linear => {
                        return k1.value + (k2.value - k1.value) * t;
                    }
                    Easing::Step => {
                        return k1.value;
                    }
                    Easing::EaseIn => {
                        let t = solve_cubic_bezier(t, 0.42, 0.0, 1.0, 1.0);
                        return k1.value + (k2.value - k1.value) * t;
                    }
                    Easing::EaseOut => {
                        let t = solve_cubic_bezier(t, 0.0, 0.0, 0.58, 1.0);
                        return k1.value + (k2.value - k1.value) * t;
                    }
                    Easing::EaseInOut => {
                        let t = solve_cubic_bezier(t, 0.42, 0.0, 0.58, 1.0);
                        return k1.value + (k2.value - k1.value) * t;
                    }
                    Easing::CubicBezier { x1, y1, x2, y2 } => {
                        let t = solve_cubic_bezier(t, *x1, *y1, *x2, *y2);
                        return k1.value + (k2.value - k1.value) * t;
                    }
                    Easing::Bezier {
                        right_dt,
                        right_dv,
                        left_dt,
                        left_dv,
                    } => {
                        return solve_absolute_cubic_bezier(
                            frame as f64,
                            k1.frame as f64,
                            k1.value,
                            k1.frame as f64 + *right_dt,
                            k1.value + *right_dv,
                            k2.frame as f64 + *left_dt,
                            k2.value + *left_dv,
                            k2.frame as f64,
                            k2.value,
                        );
                    }
                }
            }
        }

        default_value
    }

    /// Check if there is a keyframe exactly at the given frame.
    pub fn has_keyframe_at(&self, frame: u32) -> bool {
        self.keyframes
            .binary_search_by(|k| k.frame.cmp(&frame))
            .is_ok()
    }

    /// Return the number of keyframes in the channel.
    pub fn keyframe_count(&self) -> usize {
        self.keyframes.len()
    }

    /// Get all keyframes (read-only).
    pub fn keyframes(&self) -> &[Keyframe<f64>] {
        &self.keyframes
    }

    /// Remove a keyframe at the given frame. Returns true if one was removed.
    pub fn remove_keyframe_at(&mut self, frame: u32) -> bool {
        if let Ok(idx) = self.keyframes.binary_search_by(|k| k.frame.cmp(&frame)) {
            self.keyframes.remove(idx);
            true
        } else {
            false
        }
    }
}

impl Default for ScalarAnimationChannel {
    fn default() -> Self {
        Self::new()
    }
}

// ── Cubic Bezier solver ──

/// Newton-Raphson solver for cubic bezier easing curves.
///
/// Given a progress `t` (0..1), finds the corresponding y-value on the
/// cubic bezier defined by control points (x1,y1) and (x2,y2).
/// The bezier always passes through (0,0) and (1,1).
fn solve_cubic_bezier(t: f64, x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    // Newton-Raphson to find the bezier parameter x_param such that
    // cubic_bezier_x(x_param) ≈ t, then evaluate cubic_bezier_y(x_param).
    let mut x = t; // initial guess
    for _ in 0..8 {
        // 8 iterations is usually sufficient
        let dx = cubic_bezier_derivative_x(x, x1, x2);
        if dx.abs() < 1e-10 {
            break;
        }
        let fx = cubic_bezier_x(x, x1, x2) - t;
        x = (x - fx / dx).clamp(0.0, 1.0);
    }
    cubic_bezier_y(x, y1, y2)
}

/// Evaluate the x-coordinate of a cubic bezier at parameter t.
fn cubic_bezier_x(t: f64, x1: f64, x2: f64) -> f64 {
    let u = 1.0 - t;
    3.0 * u * u * t * x1 + 3.0 * u * t * t * x2 + t * t * t
}

/// Evaluate the y-coordinate of a cubic bezier at parameter t.
fn cubic_bezier_y(t: f64, y1: f64, y2: f64) -> f64 {
    let u = 1.0 - t;
    3.0 * u * u * t * y1 + 3.0 * u * t * t * y2 + t * t * t
}

/// Evaluates a 2D cubic bezier given an absolute target x (time) and 4 control points.
#[allow(clippy::too_many_arguments)]
fn solve_absolute_cubic_bezier(
    target_x: f64,
    x0: f64,
    y0: f64,
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    x3: f64,
    y3: f64,
) -> f64 {
    // Binary search over `t` since absolute handles can exceed monotonic bounds temporarily,
    // and Newton-Raphson on non-normalized curves can be unstable if not careful.
    let mut lower = 0.0;
    let mut upper = 1.0;

    for _ in 0..20 {
        let mid = (lower + upper) / 2.0;
        let u = 1.0 - mid;

        // Evaluate bezier X at t = mid
        let estimate_x = u * u * u * x0
            + 3.0 * u * u * mid * x1
            + 3.0 * u * mid * mid * x2
            + mid * mid * mid * x3;

        if estimate_x < target_x {
            lower = mid;
        } else {
            upper = mid;
        }
    }

    let t = (lower + upper) / 2.0;
    let u = 1.0 - t;

    // Evaluate bezier Y at t
    u * u * u * y0 + 3.0 * u * u * t * y1 + 3.0 * u * t * t * y2 + t * t * t * y3
}

/// Derivative of x with respect to t for Newton-Raphson.
fn cubic_bezier_derivative_x(t: f64, x1: f64, x2: f64) -> f64 {
    let u = 1.0 - t;
    3.0 * u * u * x1 + 6.0 * u * t * (x2 - x1) + 3.0 * t * t * (1.0 - x2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_channel_returns_default() {
        let channel = ScalarAnimationChannel::new();
        assert_eq!(channel.evaluate_at(10, 0.5), 0.5);
    }

    #[test]
    fn test_single_keyframe() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(0, 100.0, Easing::Linear);
        assert_eq!(channel.evaluate_at(0, 0.0), 100.0);
        assert_eq!(channel.evaluate_at(50, 0.0), 100.0);
    }

    #[test]
    fn test_linear_interpolation() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(0, 0.0, Easing::Linear);
        channel.add_keyframe(100, 100.0, Easing::Linear);

        assert!((channel.evaluate_at(50, 0.0) - 50.0).abs() < 0.01);
        assert!((channel.evaluate_at(25, 0.0) - 25.0).abs() < 0.01);
    }

    #[test]
    fn test_step_easing() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(0, 0.0, Easing::Step);
        channel.add_keyframe(100, 100.0, Easing::Linear);

        // Step holds previous value until frame boundary
        assert_eq!(channel.evaluate_at(50, 0.0), 0.0);
        assert_eq!(channel.evaluate_at(99, 0.0), 0.0);
    }

    #[test]
    fn test_ease_out() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(0, 0.0, Easing::EaseOut);
        channel.add_keyframe(100, 100.0, Easing::Linear);

        // EaseOut starts fast and decelerates — value should be > linear at midpoint
        let mid = channel.evaluate_at(50, 0.0);
        assert!(mid > 50.0, "EaseOut mid should be > 50, got {}", mid);
    }

    #[test]
    fn test_has_keyframe_at() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(42, 1.0, Easing::Linear);
        assert!(channel.has_keyframe_at(42));
        assert!(!channel.has_keyframe_at(43));
    }

    #[test]
    fn test_keyframes_sorted() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(100, 100.0, Easing::Linear);
        channel.add_keyframe(0, 0.0, Easing::Linear);
        channel.add_keyframe(50, 50.0, Easing::Linear);

        let frames: Vec<u32> = channel.keyframes().iter().map(|k| k.frame).collect();
        assert_eq!(frames, vec![0, 50, 100]);
    }

    #[test]
    fn test_remove_keyframe() {
        let mut channel = ScalarAnimationChannel::new();
        channel.add_keyframe(0, 0.0, Easing::Linear);
        channel.add_keyframe(100, 100.0, Easing::Linear);
        assert_eq!(channel.keyframe_count(), 2);

        assert!(channel.remove_keyframe_at(0));
        assert_eq!(channel.keyframe_count(), 1);
        assert!(!channel.has_keyframe_at(0));
    }
}
