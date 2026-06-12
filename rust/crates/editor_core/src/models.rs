pub struct Project {
    pub id: String,
    pub name: String,
    pub tracks: Vec<Track>,
}

pub struct Track {
    pub id: String,
    pub items: Vec<MediaItem>,
}

pub struct MediaItem {
    pub id: String,
    pub source_path: String,
    pub start_time: f64,
    pub duration: f64,
}
