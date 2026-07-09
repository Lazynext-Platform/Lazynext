//! Time module root — re-exports frame rate, media time, and timecode.
//!
//! The time crate is the single source of truth for all temporal
//! representations in Lazynext. Every other crate (state, compositor,
//! export, UI shells) consumes time types from this module.
//!
//! # Modules
//!
//! - **crdt**: CRDT-compatible timeline sync interface for distributed editing
//! - **multicam**: Multi-camera clip management with live angle switching
//! - **captions**: Subtitle/caption encoding — SRT and WebVTT serialization

mod frame_rate;
mod media_time;
mod timecode;

pub mod captions;
pub mod crdt;
pub mod multicam;

pub use frame_rate::FrameRate;
pub use media_time::{
    FloorToFrameOptions, IsFrameAlignedOptions, LastFrameTimeOptions, MediaTime,
    MediaTimeAddOptions, MediaTimeClampOptions, MediaTimeFromFrameOptions,
    MediaTimeFromSecondsOptions, MediaTimeMaxOptions, MediaTimeMinOptions, MediaTimeSubOptions,
    MediaTimeToFrameOptions, MediaTimeToSecondsOptions, RoundToFrameOptions,
    SnappedSeekTimeOptions, TICKS_PER_SECOND, floor_to_frame, is_frame_aligned, last_frame_time,
    media_time_add, media_time_clamp, media_time_from_frame, media_time_from_seconds,
    media_time_max, media_time_min, media_time_sub, media_time_to_frame, media_time_to_seconds,
    round_to_frame, snapped_seek_time,
};
pub use timecode::{
    FormatTimecodeOptions, GuessTimecodeFormatOptions, ParseTimecodeOptions, TimeCodeFormat,
    format_timecode, guess_timecode_format, parse_timecode,
};

#[cfg(test)]
mod wired_modules_tests {
    use crate::captions::{CaptionEncoder, Subtitle};
    use crate::crdt::TimelineCrdt;
    use crate::multicam::MulticamClip;

    #[test]
    fn captions_encode_srt_and_vtt() {
        let subs = vec![
            Subtitle {
                id: 1,
                start_ms: 0,
                end_ms: 1500,
                text: "Hello".to_string(),
            },
            Subtitle {
                id: 2,
                start_ms: 1500,
                end_ms: 3000,
                text: "World".to_string(),
            },
        ];
        let srt = CaptionEncoder::to_srt(&subs).expect("srt encode");
        assert!(srt.contains("00:00:00,000 --> 00:00:01,500"));
        assert!(srt.contains("Hello"));

        let vtt = CaptionEncoder::to_vtt(&subs).expect("vtt encode");
        assert!(vtt.starts_with("WEBVTT"));
        assert!(vtt.contains("00:00:01,500".replace(',', ".").as_str()));
    }

    #[test]
    fn multicam_switches_active_angle() {
        let mut clip = MulticamClip::new("mc1", vec!["a".into(), "b".into(), "c".into()]);
        assert_eq!(clip.active_angle, 0);
        clip.trigger_live_cut(2, 120);
        assert_eq!(clip.active_angle, 2);
        // Out-of-range switch is ignored.
        clip.trigger_live_cut(9, 240);
        assert_eq!(clip.active_angle, 2);
    }

    #[test]
    fn crdt_tracks_dirty_state() {
        let mut doc = TimelineCrdt::new("doc-1");
        assert!(!doc.is_dirty);
        doc.apply_delta(&[1, 2, 3]).expect("apply delta");
        assert!(doc.is_dirty);
        let _delta = doc.get_sync_delta();
        assert!(!doc.is_dirty);
    }
}
