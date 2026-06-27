use crate::filter::Filter;
use crate::types::*;

/// A complete FFMPEG filter_complex graph.
///
/// Manages a sequence of filters connected by labeled pads,
/// and generates the final `-filter_complex` argument string.
#[derive(Debug, Clone, Default)]
pub struct FilterGraph {
    /// All filters in execution order.
    pub filters: Vec<Filter>,
    /// Input stream labels.
    pub inputs: Vec<InputSpec>,
}

impl FilterGraph {
    /// Create a new empty filter graph.
    pub fn new() -> Self {
        Self {
            filters: Vec::new(),
            inputs: Vec::new(),
        }
    }

    /// Add an input stream.
    pub fn add_input(mut self, stream_index: usize, label: impl Into<String>) -> Self {
        self.inputs.push(InputSpec {
            stream_index,
            label: label.into(),
        });
        self
    }

    /// Add a filter to the graph.
    pub fn add_filter(mut self, filter: Filter) -> Self {
        self.filters.push(filter);
        self
    }

    /// Build the complete `-filter_complex` argument string.
    ///
    /// Example output:
    /// `[0:v]scale=1920:1080:flags=lanczos[scaled];[scaled]fps=60[out]`
    pub fn build(&self) -> String {
        let mut parts: Vec<String> = Vec::new();

        for filter in &self.filters {
            // Input pad labels
            let input_str = if filter.inputs.is_empty() {
                // Use the first available input stream label
                self.inputs
                    .first()
                    .map(|i| format!("[{}:{}]", i.stream_index, i.label))
                    .unwrap_or_default()
            } else {
                filter
                    .inputs
                    .iter()
                    .map(|l| format!("[{l}]"))
                    .collect::<Vec<_>>()
                    .join("")
            };

            let filter_str = filter.to_filter_string();
            let output_str = if filter.is_output {
                "[out]".to_string()
            } else {
                format!("[{}]", filter.label.output)
            };

            parts.push(format!("{input_str}{filter_str}{output_str}"));
        }

        parts.join(";")
    }

    /// Build preset: scale + fps conversion for output standardization.
    pub fn preset_scale_and_fps(
        resolution: Resolution,
        fps: FrameRate,
        algorithm: ScaleAlgorithm,
    ) -> Self {
        let scale_label = PadLabels {
            input: "v".to_string(),
            output: "scaled".to_string(),
        };
        let fps_label = PadLabels {
            input: "v".to_string(),
            output: "out".to_string(),
        };

        Self::new()
            .add_input(0, "v")
            .add_filter({
                let mut f = Filter::scale(scale_label, resolution, algorithm);
                f.inputs.push("0:v".to_string());
                f
            })
            .add_filter({
                let mut f = Filter::fps(fps_label, fps);
                f.inputs.push("scaled".to_string());
                f.as_output()
            })
    }

    /// Build preset: color grade (balance + hue).
    pub fn preset_color_grade(red: f32, green: f32, blue: f32, hue: f32, saturation: f32) -> Self {
        let balance_label = PadLabels {
            input: "v".to_string(),
            output: "balanced".to_string(),
        };
        let hue_label = PadLabels {
            input: "v".to_string(),
            output: "out".to_string(),
        };

        Self::new()
            .add_input(0, "v")
            .add_filter({
                let mut f = Filter::colorbalance(balance_label, red, green, blue);
                f.inputs.push("0:v".to_string());
                f
            })
            .add_filter({
                let mut f = Filter::hue(hue_label, hue, saturation);
                f.inputs.push("balanced".to_string());
                f.as_output()
            })
    }

    /// Build preset: text overlay with custom font.
    pub fn preset_text_overlay(
        text: impl Into<String>,
        font_size: u32,
        x: impl Into<String>,
        y: impl Into<String>,
    ) -> Self {
        let label = PadLabels {
            input: "v".to_string(),
            output: "out".to_string(),
        };

        Self::new().add_input(0, "v").add_filter({
            let mut f = Filter::drawtext(label, text, font_size, "white", x, y);
            f.inputs.push("0:v".to_string());
            f.as_output()
        })
    }

    /// Build preset: audio normalization chain.
    pub fn preset_audio_normalize(target_db: f32) -> Self {
        let vol_label = PadLabels {
            input: "a".to_string(),
            output: "out".to_string(),
        };

        Self::new().add_input(0, "a").add_filter({
            let mut f = Filter::volume(vol_label, target_db);
            f.inputs.push("0:a".to_string());
            f.as_output()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_graph() {
        let graph = FilterGraph::new();
        assert!(graph.build().is_empty());
    }

    #[test]
    fn test_scale_and_fps_preset() {
        let graph = FilterGraph::preset_scale_and_fps(
            Resolution::HD1080,
            FrameRate::Fps60,
            ScaleAlgorithm::Lanczos,
        );
        let result = graph.build();
        assert!(result.contains("scale=1920:1080"));
        assert!(result.contains("fps=60"));
        assert!(result.contains("[out]"));
    }

    #[test]
    fn test_color_grade_preset() {
        let graph = FilterGraph::preset_color_grade(0.1, -0.05, 0.0, 5.0, 1.2);
        let result = graph.build();
        assert!(result.contains("colorbalance=rs=0.1:gs=-0.05:bs=0"));
        assert!(result.contains("hue=h=5:s=1.2"));
    }

    #[test]
    fn test_text_overlay_preset() {
        let graph =
            FilterGraph::preset_text_overlay("Lazynext AI", 48, "(w-text_w)/2", "(h-text_h)/2");
        let result = graph.build();
        assert!(result.contains("drawtext=text=Lazynext AI"));
        assert!(result.contains("fontsize=48"));
    }

    #[test]
    fn test_multiple_filters_in_order() {
        let label1 = PadLabels {
            input: "v".to_string(),
            output: "scaled".to_string(),
        };
        let label2 = PadLabels {
            input: "v".to_string(),
            output: "graded".to_string(),
        };

        let graph = FilterGraph::new()
            .add_input(0, "v")
            .add_filter(Filter::scale(
                label1,
                Resolution::UHD4K,
                ScaleAlgorithm::Bicubic,
            ))
            .add_filter({
                let mut f = Filter::colorbalance(label2, 0.0, 0.0, 0.0);
                f.inputs.push("scaled".to_string());
                f.as_output()
            });

        let result = graph.build();
        let parts: Vec<&str> = result.split(';').collect();
        assert_eq!(parts.len(), 2);
    }

    #[test]
    fn test_single_filter_produces_correct_output() {
        let label = PadLabels {
            input: "v".to_string(),
            output: "out".to_string(),
        };
        let mut f = Filter::scale(label, Resolution::HD720, ScaleAlgorithm::Lanczos);
        f.inputs.push("0:v".to_string());
        let graph = FilterGraph::new()
            .add_input(0, "v")
            .add_filter(f.as_output());
        let result = graph.build();
        assert_eq!(result, "[0:v]scale=1280:720:flags=lanczos[out]");
    }

    #[test]
    fn test_chained_filters_produce_correct_complex_string() {
        let scale_label = PadLabels {
            input: "v".to_string(),
            output: "scaled".to_string(),
        };
        let fps_label = PadLabels {
            input: "v".to_string(),
            output: "out".to_string(),
        };

        let mut scale_f =
            Filter::scale(scale_label, Resolution::HD1080, ScaleAlgorithm::Lanczos);
        scale_f.inputs.push("0:v".to_string());

        let mut fps_f = Filter::fps(fps_label, FrameRate::Fps60);
        fps_f.inputs.push("scaled".to_string());

        let graph = FilterGraph::new()
            .add_input(0, "v")
            .add_filter(scale_f)
            .add_filter(fps_f.as_output());

        let result = graph.build();
        assert_eq!(
            result,
            "[0:v]scale=1920:1080:flags=lanczos[scaled];[scaled]fps=60[out]"
        );
    }

    #[test]
    fn test_three_filter_chain_scale_hue_fps() {
        let scale_label = PadLabels {
            input: "v".to_string(),
            output: "scaled".to_string(),
        };
        let hue_label = PadLabels {
            input: "v".to_string(),
            output: "graded".to_string(),
        };
        let fps_label = PadLabels {
            input: "v".to_string(),
            output: "out".to_string(),
        };

        let mut scale_f =
            Filter::scale(scale_label, Resolution::HD1080, ScaleAlgorithm::Lanczos);
        scale_f.inputs.push("0:v".to_string());

        let mut hue_f = Filter::hue(hue_label, 10.0, 1.3);
        hue_f.inputs.push("scaled".to_string());

        let mut fps_f = Filter::fps(fps_label, FrameRate::Fps30);
        fps_f.inputs.push("graded".to_string());

        let graph = FilterGraph::new()
            .add_input(0, "v")
            .add_filter(scale_f)
            .add_filter(hue_f)
            .add_filter(fps_f.as_output());

        let result = graph.build();
        let expected = concat!(
            "[0:v]scale=1920:1080:flags=lanczos[scaled];",
            "[scaled]hue=h=10:s=1.3[graded];",
            "[graded]fps=30[out]"
        );
        assert_eq!(result, expected);
    }
}
