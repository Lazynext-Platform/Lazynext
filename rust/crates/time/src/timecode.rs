//! Timecode formatting and parsing with WASM bridge exports.
//!
//! Supports MM:SS, HH:MM:SS, HH:MM:SS:CS (centiseconds), and
//! HH:MM:SS:FF (frames) formats. All functions validate bounds
//! (e.g., seconds < 60, frames < frame_rate upper bound) and
//! reject invalid input.

use bridge::export;
use serde::{Deserialize, Serialize};

use crate::{
    frame_rate::FrameRate,
    media_time::{MediaTime, TICKS_PER_SECOND},
};

const SECONDS_PER_HOUR: i64 = 3_600;
const SECONDS_PER_MINUTE: i64 = 60;
const CENTISECONDS_PER_SECOND: i64 = 100;
const TICKS_PER_CENTISECOND: i64 = TICKS_PER_SECOND / CENTISECONDS_PER_SECOND;

/// Supported timecode display formats.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TimeCodeFormat {
    /// Minutes:Seconds (MM:SS).
    #[serde(rename = "MM:SS")]
    MmSs,
    /// Hours:Minutes:Seconds (HH:MM:SS).
    #[serde(rename = "HH:MM:SS")]
    HhMmSs,
    /// Hours:Minutes:Seconds:Centiseconds (HH:MM:SS:CS).
    #[serde(rename = "HH:MM:SS:CS")]
    HhMmSsCs,
    /// Hours:Minutes:Seconds:Frames (HH:MM:SS:FF).
    #[serde(rename = "HH:MM:SS:FF")]
    HhMmSsFf,
}

/// Options for formatting a MediaTime into a timecode string.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatTimecodeOptions {
    pub time: MediaTime,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<TimeCodeFormat>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate: Option<FrameRate>,
}

/// Options for parsing a timecode string into a MediaTime.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseTimecodeOptions {
    pub time_code: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<TimeCodeFormat>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate: Option<FrameRate>,
}

/// Options for auto-detecting the timecode format from a string.
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuessTimecodeFormatOptions {
    pub time_code: String,
}

/// Detects the timecode format from a colon-delimited string by counting parts.
#[export]
pub fn guess_timecode_format(
    GuessTimecodeFormatOptions { time_code }: GuessTimecodeFormatOptions,
) -> Option<TimeCodeFormat> {
    if time_code.trim().is_empty() {
        return None;
    }

    let part_count = time_code
        .trim()
        .split(':')
        .try_fold(0usize, |count, part| {
            part.parse::<u32>().ok().map(|_| count + 1)
        })?;

    match part_count {
        2 => Some(TimeCodeFormat::MmSs),
        3 => Some(TimeCodeFormat::HhMmSs),
        4 => Some(TimeCodeFormat::HhMmSsFf),
        _ => None,
    }
}

/// Formats a MediaTime into a timecode string using the specified format and
/// optional frame rate.
#[export]
pub fn format_timecode(
    FormatTimecodeOptions { time, format, rate }: FormatTimecodeOptions,
) -> Option<String> {
    let format = format.unwrap_or(TimeCodeFormat::HhMmSsCs);
    let total_ticks = u64::try_from(time.as_ticks().max(0)).ok()?;
    let ticks_per_second = u64::try_from(TICKS_PER_SECOND).ok()?;
    let total_seconds = total_ticks / ticks_per_second;
    let hour_ticks = u64::try_from(SECONDS_PER_HOUR).ok()? * ticks_per_second;
    let minute_ticks = u64::try_from(SECONDS_PER_MINUTE).ok()? * ticks_per_second;
    let seconds_per_minute = u64::try_from(SECONDS_PER_MINUTE).ok()?;
    let ticks_per_centisecond = u64::try_from(TICKS_PER_CENTISECOND).ok()?;

    let hours = total_ticks / hour_ticks;
    let minutes = (total_ticks % hour_ticks) / minute_ticks;
    let seconds = total_seconds % seconds_per_minute;
    let second_ticks = total_ticks % ticks_per_second;
    let centiseconds = second_ticks / ticks_per_centisecond;

    match format {
        TimeCodeFormat::MmSs => Some(format!("{minutes:02}:{seconds:02}")),
        TimeCodeFormat::HhMmSs => Some(format!("{hours:02}:{minutes:02}:{seconds:02}")),
        TimeCodeFormat::HhMmSsCs => Some(format!(
            "{hours:02}:{minutes:02}:{seconds:02}:{centiseconds:02}"
        )),
        TimeCodeFormat::HhMmSsFf => {
            let rate = rate?;
            let ticks_per_frame = rate.ticks_per_frame()?;
            let frames = second_ticks / u64::try_from(ticks_per_frame).ok()?;
            Some(format!("{hours:02}:{minutes:02}:{seconds:02}:{frames:02}"))
        }
    }
}

/// Parses a timecode string into a MediaTime using the specified format and
/// optional frame rate.
#[export]
pub fn parse_timecode(
    ParseTimecodeOptions {
        time_code,
        format,
        rate,
    }: ParseTimecodeOptions,
) -> Option<MediaTime> {
    if time_code.trim().is_empty() {
        return None;
    }

    let format = format.unwrap_or(TimeCodeFormat::HhMmSsCs);
    let parts = time_code
        .trim()
        .split(':')
        .map(|part| part.parse::<u32>().ok())
        .collect::<Option<Vec<_>>>()?;

    match format {
        TimeCodeFormat::MmSs => {
            let [minutes, seconds] = parts.as_slice() else {
                return None;
            };
            if i64::from(*seconds) >= SECONDS_PER_MINUTE {
                return None;
            }

            Some(MediaTime::from_ticks(
                (i64::from(*minutes) * SECONDS_PER_MINUTE + i64::from(*seconds)) * TICKS_PER_SECOND,
            ))
        }
        TimeCodeFormat::HhMmSs => {
            let [hours, minutes, seconds] = parts.as_slice() else {
                return None;
            };
            if i64::from(*minutes) >= SECONDS_PER_MINUTE
                || i64::from(*seconds) >= SECONDS_PER_MINUTE
            {
                return None;
            }

            Some(MediaTime::from_ticks(
                (i64::from(*hours) * SECONDS_PER_HOUR
                    + i64::from(*minutes) * SECONDS_PER_MINUTE
                    + i64::from(*seconds))
                    * TICKS_PER_SECOND,
            ))
        }
        TimeCodeFormat::HhMmSsCs => {
            let [hours, minutes, seconds, centiseconds] = parts.as_slice() else {
                return None;
            };
            if i64::from(*minutes) >= SECONDS_PER_MINUTE
                || i64::from(*seconds) >= SECONDS_PER_MINUTE
                || i64::from(*centiseconds) >= CENTISECONDS_PER_SECOND
            {
                return None;
            }

            Some(MediaTime::from_ticks(
                (i64::from(*hours) * SECONDS_PER_HOUR
                    + i64::from(*minutes) * SECONDS_PER_MINUTE
                    + i64::from(*seconds))
                    * TICKS_PER_SECOND
                    + i64::from(*centiseconds) * TICKS_PER_CENTISECOND,
            ))
        }
        TimeCodeFormat::HhMmSsFf => {
            let rate = rate?;
            let frame_upper_bound = rate.frame_number_upper_bound()?;
            let [hours, minutes, seconds, frames] = parts.as_slice() else {
                return None;
            };
            if i64::from(*minutes) >= SECONDS_PER_MINUTE
                || i64::from(*seconds) >= SECONDS_PER_MINUTE
                || *frames >= frame_upper_bound
            {
                return None;
            }

            Some(
                MediaTime::from_ticks(
                    (i64::from(*hours) * SECONDS_PER_HOUR
                        + i64::from(*minutes) * SECONDS_PER_MINUTE
                        + i64::from(*seconds))
                        * TICKS_PER_SECOND,
                ) + MediaTime::from_frame(i64::from(*frames), rate)?,
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::frame_rate::FrameRate;
    use crate::media_time::MediaTime;

    use super::{FormatTimecodeOptions, GuessTimecodeFormatOptions, ParseTimecodeOptions};
    use super::{TimeCodeFormat, format_timecode, guess_timecode_format, parse_timecode};

    #[test]
    fn formats_default_and_frame_timecodes() {
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(3723.45).unwrap(),
                format: None,
                rate: None,
            }),
            Some("01:02:03:45".to_string()),
        );
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(1.5).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_30),
            }),
            Some("00:00:01:15".to_string()),
        );
    }

    #[test]
    fn parses_timecodes() {
        assert_eq!(
            parse_timecode(ParseTimecodeOptions {
                time_code: "01:05".to_string(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some(MediaTime::from_seconds_f64(65.0).unwrap()),
        );
        assert_eq!(
            parse_timecode(ParseTimecodeOptions {
                time_code: "00:00:01:15".to_string(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_30),
            }),
            Some(MediaTime::from_seconds_f64(1.5).unwrap()),
        );
        assert_eq!(
            parse_timecode(ParseTimecodeOptions {
                time_code: "00:00:01:30".to_string(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_30),
            }),
            None,
        );
    }

    #[test]
    fn formats_mm_ss_correctly() {
        // 65 seconds = 1:05
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(65.0).unwrap(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some("01:05".to_string()),
        );
        // 3723 seconds = 1h 2m 3s → MM:SS shows minutes component within the hour
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(3723.0).unwrap(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some("02:03".to_string()),
        );
        // 0 seconds = 00:00
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(0.0).unwrap(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some("00:00".to_string()),
        );
    }

    #[test]
    fn guesses_timecode_formats() {
        assert_eq!(
            guess_timecode_format(GuessTimecodeFormatOptions {
                time_code: "01:05".to_string(),
            }),
            Some(TimeCodeFormat::MmSs),
        );
        assert_eq!(
            guess_timecode_format(GuessTimecodeFormatOptions {
                time_code: "00:00:01".to_string(),
            }),
            Some(TimeCodeFormat::HhMmSs),
        );
        assert_eq!(
            guess_timecode_format(GuessTimecodeFormatOptions {
                time_code: "00:00:01:15".to_string(),
            }),
            Some(TimeCodeFormat::HhMmSsFf),
        );
    }

    #[test]
    fn format_timecode_mm_ss() {
        // 65 seconds => 01:05
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(65.0).unwrap(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some("01:05".to_string()),
        );
        // 0 seconds => 00:00
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(0.0).unwrap(),
                format: Some(TimeCodeFormat::MmSs),
                rate: None,
            }),
            Some("00:00".to_string()),
        );
    }

    #[test]
    fn format_timecode_hh_mm_ss() {
        // 1h 2m 3s => 01:02:03
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(3723.0).unwrap(),
                format: Some(TimeCodeFormat::HhMmSs),
                rate: None,
            }),
            Some("01:02:03".to_string()),
        );
        // 0 seconds => 00:00:00
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(0.0).unwrap(),
                format: Some(TimeCodeFormat::HhMmSs),
                rate: None,
            }),
            Some("00:00:00".to_string()),
        );
    }

    #[test]
    fn format_timecode_hh_mm_ss_cs() {
        // 3723.45 seconds => 01:02:03:45
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(3723.45).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsCs),
                rate: None,
            }),
            Some("01:02:03:45".to_string()),
        );
        // 0 seconds => 00:00:00:00
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(0.0).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsCs),
                rate: None,
            }),
            Some("00:00:00:00".to_string()),
        );
    }

    #[test]
    fn format_timecode_hh_mm_ss_ff() {
        // 1.5 seconds at 30 fps => 00:00:01:15 (15 frames)
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(1.5).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_30),
            }),
            Some("00:00:01:15".to_string()),
        );
        // 1 second at 24 fps => 00:00:01:00
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(1.0).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_24),
            }),
            Some("00:00:01:00".to_string()),
        );
        // 0 seconds at 60 fps => 00:00:00:00
        assert_eq!(
            format_timecode(FormatTimecodeOptions {
                time: MediaTime::from_seconds_f64(0.0).unwrap(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                rate: Some(FrameRate::FPS_60),
            }),
            Some("00:00:00:00".to_string()),
        );
    }
}
