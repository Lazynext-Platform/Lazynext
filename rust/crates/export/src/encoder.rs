// Context and Result used in pipeline.rs

/// Configuration for an export job.
#[derive(Clone, Debug)]
pub struct ExportConfig {
    pub format: ExportFormat,
    pub width: u32,
    pub height: u32,
    pub framerate: u32,
    pub bitrate_kbps: u32,
    pub output_path: String,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ExportFormat {
    Mp4,
    ProRes,
    Dcp,
    Aaf,
    Mov,
}

impl ExportFormat {
    /// Guess the export format from the output file extension.
    pub fn from_path(path: &str) -> Option<Self> {
        let ext = std::path::Path::new(path).extension().and_then(|e| e.to_str()).unwrap_or("");
        match ext.to_lowercase().as_str() {
            "mp4" => Some(ExportFormat::Mp4),
            "mov" => Some(ExportFormat::Mov),
            "mxf" => Some(ExportFormat::Dcp),
            "aaf" => Some(ExportFormat::Aaf),
            _ => None,
        }
    }

    pub fn extension(&self) -> &str {
        match self {
            ExportFormat::Mp4 => "mp4",
            ExportFormat::ProRes => "mov",
            ExportFormat::Dcp => "mxf",
            ExportFormat::Aaf => "aaf",
            ExportFormat::Mov => "mov",
        }
    }

    pub fn codec(&self) -> &str {
        match self {
            ExportFormat::Mp4 => "libx264",
            ExportFormat::ProRes => "prores_ks",
            ExportFormat::Dcp => "jpeg2000",
            ExportFormat::Aaf => "dnxhd",
            ExportFormat::Mov => "libx264",
        }
    }
}

/// Builds FFMPEG CLI arguments for encoding.
pub struct ExportEncoder;

impl ExportEncoder {
    /// Build the ffmpeg argument vector for the given config.
    pub fn build_ffmpeg_args(config: &ExportConfig) -> Vec<String> {
        let mut args = vec![
            "-y".to_string(), // overwrite
            "-f".to_string(),
            "rawvideo".to_string(),
            "-pix_fmt".to_string(),
            "rgba".to_string(),
            "-s".to_string(),
            format!("{}x{}", config.width, config.height),
            "-r".to_string(),
            config.framerate.to_string(),
            "-i".to_string(),
            "-".to_string(), // stdin pipe
            "-c:v".to_string(),
            config.format.codec().to_string(),
        ];

        match config.format {
            ExportFormat::Mp4 | ExportFormat::Mov => {
                args.push("-preset".to_string());
                args.push("medium".to_string());
                args.push("-crf".to_string());
                args.push("18".to_string());
                args.push("-pix_fmt".to_string());
                args.push("yuv420p".to_string());
            }
            ExportFormat::ProRes => {
                args.push("-profile:v".to_string());
                args.push("3".to_string()); // ProRes 422 HQ
                args.push("-pix_fmt".to_string());
                args.push("yuv422p10le".to_string());
            }
            ExportFormat::Dcp => {
                args.push("-pix_fmt".to_string());
                args.push("xyz12le".to_string());
                args.push("-color_primaries".to_string());
                args.push("smpte431".to_string());
                args.push("-color_trc".to_string());
                args.push("gamma28".to_string());
            }
            ExportFormat::Aaf => {
                args.push("-pix_fmt".to_string());
                args.push("yuv422p".to_string());
            }
        }

        if config.bitrate_kbps > 0 {
            args.push("-b:v".to_string());
            args.push(format!("{}k", config.bitrate_kbps));
        }

        args.push(config.output_path.clone());
        args
    }

    /// Returns the pipe command for ffmpeg stdin.
    /// The compositor renders frames and writes RGBA bytes to stdin.
    pub fn pipe_command(config: &ExportConfig) -> (String, Vec<String>) {
        let args = Self::build_ffmpeg_args(config);
        ("ffmpeg".to_string(), args)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mp4_args() {
        let config = ExportConfig {
            format: ExportFormat::Mp4,
            width: 1920,
            height: 1080,
            framerate: 24,
            bitrate_kbps: 8000,
            output_path: "/tmp/test.mp4".into(),
        };
        let args = ExportEncoder::build_ffmpeg_args(&config);
        assert!(args.contains(&"-c:v".to_string()));
        assert!(args.contains(&"libx264".to_string()));
        assert!(args.contains(&"-pix_fmt".to_string()));
        assert!(args.contains(&"yuv420p".to_string()));
    }

    #[test]
    fn test_prores_args() {
        let config = ExportConfig {
            format: ExportFormat::ProRes,
            width: 3840,
            height: 2160,
            framerate: 24,
            bitrate_kbps: 0,
            output_path: "/tmp/test.mov".into(),
        };
        let args = ExportEncoder::build_ffmpeg_args(&config);
        assert!(args.contains(&"prores_ks".to_string()));
    }

    #[test]
    fn test_dcp_args() {
        let config = ExportConfig {
            format: ExportFormat::Dcp,
            width: 2048,
            height: 1080,
            framerate: 24,
            bitrate_kbps: 0,
            output_path: "/tmp/dcp.mxf".into(),
        };
        let args = ExportEncoder::build_ffmpeg_args(&config);
        assert!(args.contains(&"jpeg2000".to_string()));
        assert!(args.contains(&"xyz12le".to_string()));
    }

    #[test]
    fn test_mov_args() {
        let config = ExportConfig {
            format: ExportFormat::Mov,
            width: 1920,
            height: 1080,
            framerate: 30,
            bitrate_kbps: 12000,
            output_path: "/tmp/test.mov".into(),
        };
        let args = ExportEncoder::build_ffmpeg_args(&config);
        assert!(args.contains(&"-c:v".to_string()));
        assert!(args.contains(&"libx264".to_string()));
        assert!(args.contains(&"yuv420p".to_string()));
        assert!(args.contains(&"-preset".to_string()));
        assert!(args.contains(&"-crf".to_string()));
        // Output path must be the last argument
        assert_eq!(args.last().unwrap(), "/tmp/test.mov");
    }

    #[test]
    fn test_aaf_args() {
        let config = ExportConfig {
            format: ExportFormat::Aaf,
            width: 1920,
            height: 1080,
            framerate: 24,
            bitrate_kbps: 0,
            output_path: "/tmp/test.aaf".into(),
        };
        let args = ExportEncoder::build_ffmpeg_args(&config);
        assert!(args.contains(&"dnxhd".to_string()));
        assert!(args.contains(&"yuv422p".to_string()));
        // AAF should not include crf or preset flags
        assert!(!args.contains(&"-crf".to_string()));
        assert!(!args.contains(&"-preset".to_string()));
    }

    #[test]
    fn test_export_format_from_path_all_formats() {
        assert_eq!(
            ExportFormat::from_path("video.mp4"),
            Some(ExportFormat::Mp4)
        );
        assert_eq!(
            ExportFormat::from_path("video.mov"),
            Some(ExportFormat::Mov)
        );
        assert_eq!(
            ExportFormat::from_path("video.mxf"),
            Some(ExportFormat::Dcp)
        );
        assert_eq!(
            ExportFormat::from_path("video.aaf"),
            Some(ExportFormat::Aaf)
        );
        // Unknown extension returns None
        assert_eq!(ExportFormat::from_path("video.xyz"), None);
    }

    #[test]
    fn test_export_format_codec_extension_consistency() {
        let formats = [
            ExportFormat::Mp4,
            ExportFormat::ProRes,
            ExportFormat::Dcp,
            ExportFormat::Aaf,
            ExportFormat::Mov,
        ];
        for fmt in &formats {
            assert!(
                !fmt.codec().is_empty(),
                "codec must not be empty for {:?}",
                fmt
            );
            assert!(
                !fmt.extension().is_empty(),
                "extension must not be empty for {:?}",
                fmt
            );
        }
    }
}
