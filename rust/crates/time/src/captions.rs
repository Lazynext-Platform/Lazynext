use anyhow::Result;
use std::fmt::Write;

pub struct Subtitle {
    pub id: u32,
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
}

pub struct CaptionEncoder;

impl CaptionEncoder {
    /// Formats milliseconds into the standard SRT timestamp format: HH:MM:SS,mmm
    fn format_srt_timestamp(ms: u64) -> String {
        let hours = ms / 3_600_000;
        let mins = (ms / 60_000) % 60;
        let secs = (ms / 1000) % 60;
        let millis = ms % 1000;
        format!("{:02}:{:02}:{:02},{:03}", hours, mins, secs, millis)
    }

    /// Formats milliseconds into the standard WebVTT timestamp format: HH:MM:SS.mmm
    fn format_vtt_timestamp(ms: u64) -> String {
        let hours = ms / 3_600_000;
        let mins = (ms / 60_000) % 60;
        let secs = (ms / 1000) % 60;
        let millis = ms % 1000;
        format!("{:02}:{:02}:{:02}.{:03}", hours, mins, secs, millis)
    }

    /// Serializes a list of Subtitles into the SubRip (.srt) format
    pub fn to_srt(subtitles: &[Subtitle]) -> Result<String> {
        let mut out = String::new();
        for (i, sub) in subtitles.iter().enumerate() {
            writeln!(&mut out, "{}", i + 1)?;
            writeln!(
                &mut out,
                "{} --> {}",
                Self::format_srt_timestamp(sub.start_ms),
                Self::format_srt_timestamp(sub.end_ms)
            )?;
            writeln!(&mut out, "{}", sub.text)?;
            writeln!(&mut out, "")?;
        }
        Ok(out)
    }

    /// Serializes a list of Subtitles into the WebVTT (.vtt) format
    pub fn to_vtt(subtitles: &[Subtitle]) -> Result<String> {
        let mut out = String::from("WEBVTT\n\n");
        for sub in subtitles {
            writeln!(
                &mut out,
                "{} --> {}",
                Self::format_vtt_timestamp(sub.start_ms),
                Self::format_vtt_timestamp(sub.end_ms)
            )?;
            writeln!(&mut out, "{}", sub.text)?;
            writeln!(&mut out, "")?;
        }
        Ok(out)
    }
}
