use anyhow::{Context, Result};
use chrono::Utc;
use state::ProjectData;
use std::fs::File;
use std::io::Write;
use uuid::Uuid;

pub struct DCPGenerator;

impl Default for DCPGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl DCPGenerator {
    pub fn new() -> Self {
        Self
    }

    /// Generates a Digital Cinema Package (DCP) Composition Playlist (CPL)
    pub fn generate_cpl(&self, project: &ProjectData, output_path: &str) -> Result<()> {
        let uuid = Uuid::new_v4().urn().to_string();
        let issue_date = Utc::now().to_rfc3339();

        let cpl_content = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<CompositionPlaylist xmlns="http://www.smpte-ra.org/schemas/429-7/2006/CPL">
    <Id>{}</Id>
    <AnnotationText>{}</AnnotationText>
    <IssueDate>{}</IssueDate>
    <Issuer>Lazynext</Issuer>
    <Creator>Lazynext DCP Engine</Creator>
    <ContentTitleText>{}</ContentTitleText>
    <ContentKind>feature</ContentKind>
    <ReelList>
        <Reel>
            <Id>{}</Id>
            <AssetList>
                <MainPicture>
                    <Id>{}</Id>
                    <EditRate>24 1</EditRate>
                    <IntrinsicDuration>{}</IntrinsicDuration>
                    <ScreenAspectRatio>1.85</ScreenAspectRatio>
                </MainPicture>
            </AssetList>
        </Reel>
    </ReelList>
</CompositionPlaylist>"#,
            uuid,
            project.name,
            issue_date,
            project.name,
            Uuid::new_v4().urn(),
            Uuid::new_v4().urn(),
            project.duration_frames
        );

        let mut file = File::create(output_path).context("Failed to create CPL file")?;
        file.write_all(cpl_content.as_bytes())
            .context("Failed to write CPL content")?;
        Ok(())
    }
}
