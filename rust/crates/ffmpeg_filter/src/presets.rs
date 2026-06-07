//! Ready-to-use filter graph presets for common video operations.

use crate::filter::Filter;
use crate::graph::FilterGraph;
use crate::types::*;

/// Build a complete export pipeline: scale, fps conversion, color grade, format.
pub fn export_pipeline(
	resolution: Resolution,
	fps: FrameRate,
	red: f32,
	green: f32,
	blue: f32,
	saturation: f32,
	pix_fmt: PixelFormat,
) -> FilterGraph {
	let scale_label = PadLabels { input: "v".into(), output: "scaled".into() };
	let fps_label = PadLabels { input: "v".into(), output: "fps_out".into() };
	let balance_label = PadLabels { input: "v".into(), output: "balanced".into() };
	let hue_label = PadLabels { input: "v".into(), output: "graded".into() };
	let fmt_label = PadLabels { input: "v".into(), output: "out".into() };

	FilterGraph::new()
		.add_input(0, "v")
		.add_filter({
			let mut f = Filter::scale(scale_label, resolution, ScaleAlgorithm::Lanczos);
			f.inputs.push("0:v".into());
			f
		})
		.add_filter({
			let mut f = Filter::fps(fps_label, fps);
			f.inputs.push("scaled".into());
			f
		})
		.add_filter({
			let mut f = Filter::colorbalance(balance_label, red, green, blue);
			f.inputs.push("fps_out".into());
			f
		})
		.add_filter({
			let mut f = Filter::hue(hue_label, 0.0, saturation);
			f.inputs.push("balanced".into());
			f
		})
		.add_filter({
			let mut f = Filter::format(fmt_label, pix_fmt);
			f.inputs.push("graded".into());
			f.as_output()
		})
}

/// Build a picture-in-picture overlay preset.
pub fn picture_in_picture(
	main_resolution: Resolution,
	pip_scale: f32,
	x: &str,
	y: &str,
) -> FilterGraph {
	let scale_label = PadLabels { input: "pip".into(), output: "pip_scaled".into() };
	let overlay_label = PadLabels { input: "v".into(), output: "out".into() };

	let pip_w = (main_resolution.width() as f32 * pip_scale) as u32;
	let pip_h = (main_resolution.height() as f32 * pip_scale) as u32;

	FilterGraph::new()
		.add_input(0, "v")
		.add_input(1, "pip")
		.add_filter({
			let mut f = Filter::scale(scale_label, Resolution::Custom(pip_w, pip_h), ScaleAlgorithm::Lanczos);
			f.inputs.push("1:pip".into());
			f
		})
		.add_filter({
			let mut f = Filter::overlay(overlay_label, x, y);
			f.inputs.push("0:v".into());
			f.inputs.push("pip_scaled".into());
			f.as_output()
		})
}

/// Build a slow-motion preset using setpts.
pub fn slow_motion(speed_factor: f32) -> FilterGraph {
	let label = PadLabels { input: "v".into(), output: "out".into() };
	let expr = format!("{speed_factor}*PTS");

	FilterGraph::new()
		.add_input(0, "v")
		.add_filter({
			let mut f = Filter::setpts(label, expr);
			f.inputs.push("0:v".into());
			f.as_output()
		})
}

/// Build a crossfade transition between two clips.
pub fn crossfade_transition(duration_seconds: f32) -> FilterGraph {
	let label = PadLabels { input: "v".into(), output: "out".into() };

	FilterGraph::new()
		.add_input(0, "v")
		.add_input(1, "v")
		.add_filter({
			let mut f = Filter::crossfade(label, duration_seconds);
			f.inputs.push("0:v".into());
			f.inputs.push("1:v".into());
			f.as_output()
		})
}

/// Build a vintage film look: desaturate + add grain-like blur + sepia tint.
pub fn vintage_film() -> FilterGraph {
	let hue_label = PadLabels { input: "v".into(), output: "desaturated".into() };
	let blur_label = PadLabels { input: "v".into(), output: "out".into() };

	FilterGraph::new()
		.add_input(0, "v")
		.add_filter({
			let mut f = Filter::hue(hue_label, 0.0, 0.3);
			f.inputs.push("0:v".into());
			f
		})
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
			0.0, 0.0, 0.0,
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
