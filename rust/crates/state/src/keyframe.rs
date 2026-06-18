use serde::{Deserialize, Serialize};

/// Easing functions for keyframe interpolation.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum Easing {
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
}

impl Default for Easing {
    fn default() -> Self {
        Self::Linear
    }
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

                let mut t = (frame - k1.frame) as f64 / range;

                // Apply easing
                t = match &k1.easing {
                    Easing::Linear => t,
                    Easing::Step => 0.0,
                    Easing::EaseIn => solve_cubic_bezier(t, 0.42, 0.0, 1.0, 1.0),
                    Easing::EaseOut => solve_cubic_bezier(t, 0.0, 0.0, 0.58, 1.0),
                    Easing::EaseInOut => solve_cubic_bezier(t, 0.42, 0.0, 0.58, 1.0),
                    Easing::CubicBezier { x1, y1, x2, y2 } => {
                        solve_cubic_bezier(t, *x1, *y1, *x2, *y2)
                    }
                };

                return k1.value + (k2.value - k1.value) * t;
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
