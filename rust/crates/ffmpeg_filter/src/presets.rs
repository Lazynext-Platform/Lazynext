//! Ready-to-use filter graph presets for common video operations.
//!
//! ## Preset System
//!
//! Each preset function constructs a [`FilterGraph`] by chaining individual
//! FFmpeg filter nodes (scale, fps, colorbalance, hue, overlay, etc.) together
//! via named pad labels. The graph is built by calling `.add_input()` for each
//! video stream, then `.add_filter()` for each processing stage, connecting
//! inputs to outputs using pad labels.
//!
//! The last filter in each chain is marked `.as_output()`, which tags its output
//! pad as the graph's final output (label `[out]`).
//!
//! ### Available presets
//!
//! | Preset | Filters used | Description |
//! |--------|-------------|-------------|
//! | `export_pipeline` | scale → fps → colorbalance → hue → format | Full export chain |
//! | `picture_in_picture` | scale → overlay | PIP compositing |
//! | `slow_motion` | setpts | Speed adjustment via PTS manipulation |
//! | `crossfade_transition` | xfade | Fade between two clips |
//! | `vintage_film` | hue → boxblur | Desaturated film look |

use crate::filter::Filter;
use crate::graph::FilterGraph;
use crate::types::*;

/// Build a complete export pipeline: scale, fps conversion, color grade, format.
///
/// Filter chain: `scale → fps → colorbalance → hue → format → [out]`
pub fn export_pipeline(
    resolution: Resolution,
    fps: FrameRate,
    red: f32,
    green: f32,
    blue: f32,
    saturation: f32,
    pix_fmt: PixelFormat,
) -> FilterGraph {
    let scale_label = PadLabels {
        input: "v".into(),
        output: "scaled".into(),
    };
    let fps_label = PadLabels {
        input: "v".into(),
        output: "fps_out".into(),
    };
    let balance_label = PadLabels {
        input: "v".into(),
        output: "balanced".into(),
    };
    let hue_label = PadLabels {
        input: "v".into(),
        output: "graded".into(),
    };
    let fmt_label = PadLabels {
        input: "v".into(),
        output: "out".into(),
    };

    FilterGraph::new()
        .add_input(0, "v")
        // Stage 1: Resize to target resolution (Lanczos for quality).
        .add_filter({
            let mut f = Filter::scale(scale_label, resolution, ScaleAlgorithm::Lanczos);
            f.inputs.push("0:v".into());
            f
        })
        // Stage 2: Convert frame rate.
        .add_filter({
            let mut f = Filter::fps(fps_label, fps);
            f.inputs.push("scaled".into());
            f
        })
        // Stage 3: Adjust RGB color balance (lift/gamma/gain).
        .add_filter({
            let mut f = Filter::colorbalance(balance_label, red, green, blue);
            f.inputs.push("fps_out".into());
            f
        })
        // Stage 4: Adjust saturation (hue rotation set to 0).
        .add_filter({
            let mut f = Filter::hue(hue_label, 0.0, saturation);
            f.inputs.push("balanced".into());
            f
        })
        // Stage 5: Convert pixel format and mark as output.
        .add_filter({
            let mut f = Filter::format(fmt_label, pix_fmt);
            f.inputs.push("graded".into());
            f.as_output()
        })
}

/// Build a picture-in-picture overlay preset.
/// pip_scale is clamped to [0.01, 1.0] for safety.
///
/// Filter chain: `scale (PIP) → overlay (main + scaled PIP) → [out]`
/// Input 0 is the main video, input 1 is the PIP video.
pub fn picture_in_picture(
    main_resolution: Resolution,
    pip_scale: f32,
    x: &str,
    y: &str,
) -> FilterGraph {
    let pip_scale = pip_scale.clamp(0.01, 1.0);
    let scale_label = PadLabels {
        input: "pip".into(),
        output: "pip_scaled".into(),
    };
    let overlay_label = PadLabels {
        input: "v".into(),
        output: "out".into(),
    };

    let pip_w = (main_resolution.width() as f32 * pip_scale) as u32;
    let pip_h = (main_resolution.height() as f32 * pip_scale) as u32;

    FilterGraph::new()
        .add_input(0, "v")
        .add_input(1, "pip")
        // Scale the PIP input to a fraction of the main resolution.
        .add_filter({
            let mut f = Filter::scale(
                scale_label,
                Resolution::Custom(pip_w, pip_h),
                ScaleAlgorithm::Lanczos,
            );
            f.inputs.push("1:pip".into());
            f
        })
        // Composite the scaled PIP onto the main video. Output is [out].
        .add_filter({
            let mut f = Filter::overlay(overlay_label, x, y);
            f.inputs.push("0:v".into());
            f.inputs.push("pip_scaled".into());
            f.as_output()
        })
}

/// Build a slow-motion preset using setpts.
/// Speed factor must be > 0; clamped to [0.0625, 16.0] (1/16x to 16x).
///
/// Filter chain: `setpts → [out]`
/// Multiplies each frame's PTS (presentation timestamp) by the speed factor.
/// A factor of 2.0 means 2× slow motion; 0.5 means 2× fast motion.
pub fn slow_motion(speed_factor: f32) -> FilterGraph {
    let speed_factor = speed_factor.clamp(0.0625, 16.0);
    let label = PadLabels {
        input: "v".into(),
        output: "out".into(),
    };
    let expr = format!("{speed_factor}*PTS");

    // Single-stage graph: one setpts filter with the expression "{speed_factor}*PTS".
    FilterGraph::new().add_input(0, "v").add_filter({
        let mut f = Filter::setpts(label, expr);
        f.inputs.push("0:v".into());
        f.as_output()
    })
}

/// Build a crossfade transition between two clips.
///
/// Filter chain: `xfade (input 0 + input 1) → [out]`
/// Uses FFmpeg's xfade filter with the `fade` transition type. The offset
/// parameter controls when the transition begins relative to the duration of
/// the first input.
pub fn crossfade_transition(duration_seconds: f32) -> FilterGraph {
    let label = PadLabels {
        input: "v".into(),
        output: "out".into(),
    };

    FilterGraph::new()
        .add_input(0, "v")
        .add_input(1, "v")
        // xfade with fade transition: blends from input 0 to input 1 over duration_seconds.
        .add_filter({
            let mut f = Filter::crossfade(label, duration_seconds);
            f.inputs.push("0:v".into());
            f.inputs.push("1:v".into());
            f.as_output()
        })
}

/// Build a vintage film look: desaturate + add grain-like blur + sepia tint.
///
/// Filter chain: `hue (desaturate) → boxblur (film grain sim) → [out]`
/// Reduces saturation to 0.3 and applies a subtle box blur to emulate
/// the softness and grain of vintage film stock.
pub fn vintage_film() -> FilterGraph {
    let hue_label = PadLabels {
        input: "v".into(),
        output: "desaturated".into(),
    };
    let blur_label = PadLabels {
        input: "v".into(),
        output: "out".into(),
    };

    FilterGraph::new()
        .add_input(0, "v")
        // Stage 1: Drop saturation to 0.3 for a washed-out film look.
        .add_filter({
            let mut f = Filter::hue(hue_label, 0.0, 0.3);
            f.inputs.push("0:v".into());
            f
        })
        // Stage 2: Apply a subtle box blur to simulate film grain softness.
        .add_filter({
            let mut f = Filter::boxblur(blur_label, 1, 1);
            f.inputs.push("desaturated".into());
            f.as_output()
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_pipeline_output() {
        let graph = export_pipeline(
            Resolution::HD1080,
            FrameRate::Fps60,
            0.0,
            0.0,
            0.0,
            1.0,
            PixelFormat::Yuv420p,
        );
        let result = graph.build();
        assert!(result.contains("scale=1920:1080"));
        assert!(result.contains("fps=60"));
        assert!(result.contains("colorbalance"));
        assert!(result.contains("hue"));
        assert!(result.contains("format=pix_fmts=yuv420p"));
        assert!(result.contains("[out]"));
    }

    #[test]
    fn test_pip_output() {
        let graph = picture_in_picture(Resolution::HD1080, 0.25, "10", "10");
        let result = graph.build();
        assert!(result.contains("scale=480:270"));
        assert!(result.contains("overlay=x=10:y=10"));
    }

    #[test]
    fn test_slow_motion_output() {
        let graph = slow_motion(0.5);
        let result = graph.build();
        assert!(result.contains("setpts=0.5*PTS"));
    }

    #[test]
    fn test_crossfade_output() {
        let graph = crossfade_transition(2.0);
        let result = graph.build();
        assert!(result.contains("xfade=transition=fade:duration=2:offset=0"));
    }

    #[test]
    fn test_vintage_film_output() {
        let graph = vintage_film();
        let result = graph.build();
        assert!(result.contains("hue=h=0:s=0.3"));
        assert!(result.contains("boxblur"));
    }
}
