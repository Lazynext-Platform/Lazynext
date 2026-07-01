//! Core domain models for the non-linear video editor.
//!
//! Defines the foundational data structures — Project, Track, and MediaItem — that
//! represent the timeline composition graph used throughout the NLE engine.

/// Top-level project containing tracks arranged in a timeline.
pub struct Project {
    /// Unique project identifier.
    pub id: String,
    /// Human-readable project name.
    pub name: String,
    /// Ordered list of tracks in the composition.
    pub tracks: Vec<Track>,
}

/// A single track containing an ordered sequence of media items.
pub struct Track {
    /// Unique track identifier.
    pub id: String,
    /// Ordered list of media items on this track.
    pub items: Vec<MediaItem>,
}

/// A media clip positioned on a track with timing information.
pub struct MediaItem {
    /// Unique clip identifier.
    pub id: String,
    /// Filesystem path to the source media.
    pub source_path: String,
    /// Start time in seconds on the timeline.
    pub start_time: f64,
    /// Duration of the clip in seconds.
    pub duration: f64,
}
