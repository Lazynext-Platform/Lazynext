use anyhow::{Context, Result};
use state::ProjectData;
use std::fs::File;
use std::io::Write;
use uuid::Uuid;

pub struct AAFExporter;

impl Default for AAFExporter {
    fn default() -> Self {
        Self::new()
    }
}

impl AAFExporter {
    pub fn new() -> Self {
        Self
    }

    /// Generates a structured Advanced Authoring Format (AAF) manifest for Pro Tools / Avid
    pub fn generate_aaf(&self, project: &ProjectData, output_path: &str) -> Result<()> {
        let uuid = Uuid::new_v4().urn().to_string();

        let aaf_content = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<AAF>
    <Header>
        <ProjectID>{}</ProjectID>
        <Name>{}</Name>
        <FPS>{}</FPS>
        <Software>Lazynext</Software>
    </Header>
    <Timeline>
        <Tracks>{}</Tracks>
    </Timeline>
</AAF>"#,
            uuid,
            project.name,
            project.fps,
            self.format_tracks(project)
        );

        let mut file = File::create(output_path).context("Failed to create AAF file")?;
        file.write_all(aaf_content.as_bytes())
            .context("Failed to write AAF content")?;
        Ok(())
    }

    fn format_tracks(&self, project: &ProjectData) -> String {
        let mut tracks_str = String::new();
        for track in &project.tracks {
            tracks_str.push_str(&format!(
                r#"
            <Track>
                <ID>{}</ID>
                <Name>{}</Name>
                <Type>{}</Type>
                <ClipsCount>{}</ClipsCount>
            </Track>"#,
                track.id,
                track.name,
                track.track_type,
                track.clips.len()
            ));
        }
        tracks_str
    }
}
