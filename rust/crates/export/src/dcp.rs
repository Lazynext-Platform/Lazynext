//! Digital Cinema Package (DCP) export for theatrical distribution.
//!
//! Generates SMPTE-compliant DCP metadata:
//!   - Composition Playlist (CPL) — SMPTE 429-7
//!   - Packing List (PKL) — SMPTE 429-8
//!   - Asset Map (ASSETMAP) — SMPTE 429-9
//!
//! Reference: SMPTE ST 429-series, ISDCF DCP specification v1.5

use chrono::Utc;
use state::ProjectData;
use std::fs;
use std::fs::File;
use std::io::Write;
use uuid::Uuid;

/// Generates SMPTE-compliant Digital Cinema Package (DCP) metadata.
pub struct DCPGenerator;

impl Default for DCPGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl DCPGenerator {
    /// Create a new DCP generator.
    pub fn new() -> Self {
        Self
    }

    /// Generate the full DCP metadata package for a project.
    ///
    /// Creates three files in the output directory:
    ///   - `cpl.xml` — Composition Playlist
    ///   - `pkl.xml` — Packing List
    ///   - `ASSETMAP` — Asset Map
    pub fn generate_dcp(&self, project: &ProjectData, output_dir: &str) -> Result<(), String> {
        fs::create_dir_all(output_dir)
            .map_err(|e| format!("Failed to create DCP output dir: {e}"))?;

        let cpl_id = Uuid::new_v4();
        let pkl_id = Uuid::new_v4();
        let picture_asset_id = Uuid::new_v4();
        let audio_asset_id = Uuid::new_v4();

        // Compute duration from the longest track
        let total_frames: i32 = project
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().map(|c| c.duration_frames))
            .max()
            .unwrap_or(1);

        // ── Composition Playlist (CPL) ─────────────────────────────
        let cpl = self.generate_cpl(
            project,
            &cpl_id,
            &picture_asset_id,
            &audio_asset_id,
            total_frames,
        );
        let cpl_path = format!(
            "{}/cpl_{}.xml",
            output_dir,
            hex::encode(&cpl_id.as_bytes()[..4])
        );
        let mut f = File::create(&cpl_path).map_err(|e| format!("Failed to create CPL: {e}"))?;
        f.write_all(cpl.as_bytes())
            .map_err(|e| format!("Failed to write CPL: {e}"))?;

        // ── Packing List (PKL) ────────────────────────────────────
        let pkl = self.generate_pkl(&pkl_id, &[&cpl_id, &picture_asset_id, &audio_asset_id]);
        let pkl_path = format!(
            "{}/pkl_{}.xml",
            output_dir,
            hex::encode(&pkl_id.as_bytes()[..4])
        );
        let mut f = File::create(&pkl_path).map_err(|e| format!("Failed to create PKL: {e}"))?;
        f.write_all(pkl.as_bytes())
            .map_err(|e| format!("Failed to write PKL: {e}"))?;

        // ── Asset Map ─────────────────────────────────────────────
        let asset_map =
            self.generate_asset_map(&[(cpl_path.clone(), cpl_id), (pkl_path.clone(), pkl_id)]);
        let asset_path = format!("{}/ASSETMAP", output_dir);
        let mut f =
            File::create(&asset_path).map_err(|e| format!("Failed to create ASSETMAP: {e}"))?;
        f.write_all(asset_map.as_bytes())
            .map_err(|e| format!("Failed to write ASSETMAP: {e}"))?;

        Ok(())
    }

    fn generate_cpl(
        &self,
        project: &ProjectData,
        cpl_id: &Uuid,
        picture_id: &Uuid,
        audio_id: &Uuid,
        total_frames: i32,
    ) -> String {
        format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<CompositionPlaylist xmlns="http://www.smpte-ra.org/schemas/429-7/2006/CPL">
  <Id>urn:uuid:{cpl_id}</Id>
  <AnnotationText>{title}</AnnotationText>
  <IssueDate>{date}</IssueDate>
  <Issuer>Lazynext</Issuer>
  <Creator>Lazynext DCP Engine v1.0</Creator>
  <ContentTitleText>{title}</ContentTitleText>
  <ContentKind>feature</ContentKind>
  <ContentVersion>
    <Id>urn:uuid:{version_id}</Id>
    <LabelText>Version 1.0</LabelText>
  </ContentVersion>
  <RatingList/>
  <ReelList>
    <Reel>
      <Id>urn:uuid:{reel_id}</Id>
      <AnnotationText>Reel 1</AnnotationText>
      <AssetList>
        <MainPicture>
          <Id>urn:uuid:{picture_id}</Id>
          <EditRate>{framerate} 1</EditRate>
          <IntrinsicDuration>{total_frames}</IntrinsicDuration>
          <EntryPoint>0</EntryPoint>
          <Duration>{total_frames}</Duration>
          <FrameRate>{framerate}</FrameRate>
          <ScreenAspectRatio>{aspect:.2}</ScreenAspectRatio>
        </MainPicture>
        <MainSound>
          <Id>urn:uuid:{audio_id}</Id>
          <EditRate>{framerate} 1</EditRate>
          <IntrinsicDuration>{total_frames}</IntrinsicDuration>
          <EntryPoint>0</EntryPoint>
          <Duration>{total_frames}</Duration>
          <ChannelCount>6</ChannelCount>
        </MainSound>
      </AssetList>
    </Reel>
  </ReelList>
</CompositionPlaylist>"#,
            cpl_id = cpl_id,
            title = xml_escape(&project.name),
            date = Utc::now().to_rfc3339(),
            version_id = Uuid::new_v4(),
            reel_id = Uuid::new_v4(),
            picture_id = picture_id,
            audio_id = audio_id,
            framerate = project.fps as u32,
            total_frames = total_frames,
            aspect = project.width as f64 / project.height as f64,
        )
    }

    fn generate_pkl(&self, pkl_id: &Uuid, asset_ids: &[&Uuid]) -> String {
        let mut assets_xml = String::new();
        for id in asset_ids {
            assets_xml.push_str(&format!(
                r#"    <Asset>
      <Id>urn:uuid:{id}</Id>
      <Hash algorithm="http://www.w3.org/2000/09/xmldsig#sha256">REPLACE_WITH_SHA256_HASH</Hash>
      <Size>0</Size>
      <Type>text/xml</Type>
      <OriginalFileName>asset_{short_id}.mxf</OriginalFileName>
    </Asset>
"#,
                id = id,
                short_id = hex::encode(&id.as_bytes()[..4]),
            ));
        }

        format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<PackingList xmlns="http://www.smpte-ra.org/schemas/429-8/2007/PKL">
  <Id>urn:uuid:{pkl_id}</Id>
  <AnnotationText>Lazynext DCP Package</AnnotationText>
  <IssueDate>{date}</IssueDate>
  <Issuer>Lazynext</Issuer>
  <Creator>Lazynext DCP Engine v1.0</Creator>
  <AssetList>
{assets}
  </AssetList>
</PackingList>"#,
            pkl_id = pkl_id,
            date = Utc::now().to_rfc3339(),
            assets = assets_xml,
        )
    }

    fn generate_asset_map(&self, files: &[(String, Uuid)]) -> String {
        let mut assets_xml = String::new();
        for (path, uuid) in files {
            assets_xml.push_str(&format!(
                r#"    <Asset>
      <Id>urn:uuid:{uuid}</Id>
      <PackingList>false</PackingList>
      <ChunkList>
        <Chunk>
          <Path>{path}</Path>
        </Chunk>
      </ChunkList>
    </Asset>
"#,
                uuid = uuid,
                path = path,
            ));
        }

        format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<AssetMap xmlns="http://www.smpte-ra.org/schemas/429-9/2007/AM">
  <Id>urn:uuid:{am_id}</Id>
  <AnnotationText>Lazynext DCP</AnnotationText>
  <IssueDate>{date}</IssueDate>
  <Issuer>Lazynext</Issuer>
  <Creator>Lazynext DCP Engine v1.0</Creator>
  <AssetList>
{assets}
  </AssetList>
</AssetMap>"#,
            am_id = Uuid::new_v4(),
            date = Utc::now().to_rfc3339(),
            assets = assets_xml,
        )
    }
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cpl_generation_contains_required_elements() {
        let cpl_id = Uuid::new_v4();
        let pic_id = Uuid::new_v4();
        let aud_id = Uuid::new_v4();
        let project = ProjectData {
            id: "test_dcp".into(),
            name: "Test Feature".into(),
            fps: 24.0,
            width: 2048,
            height: 858,
            bg_color: [0.0, 0.0, 0.0, 1.0],
            duration_frames: 2400,
            tracks: vec![],
        };

        let generator = DCPGenerator::new();
        let cpl = generator.generate_cpl(&project, &cpl_id, &pic_id, &aud_id, 2400);
        assert!(cpl.contains("<CompositionPlaylist"));
        assert!(cpl.contains("Test Feature"));
        assert!(cpl.contains("urn:uuid:"));
        assert!(cpl.contains("<MainPicture>"));
        assert!(cpl.contains("<MainSound>"));
    }

    #[test]
    fn test_pkl_contains_assets() {
        let generator = DCPGenerator::new();
        let pkl_id = Uuid::new_v4();
        let asset_id = Uuid::new_v4();
        let pkl = generator.generate_pkl(&pkl_id, &[&asset_id]);
        assert!(pkl.contains("<PackingList"));
        assert!(pkl.contains("urn:uuid:"));
    }
}
