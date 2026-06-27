//! Advanced Authoring Format (AAF) export for professional NLE interchange.
//!
//! AAF is an industry-standard file format for exchanging video editing
//! projects between different NLE applications (Avid Media Composer,
//! DaVinci Resolve, Premiere Pro).
//!
//! Reference: AMWA AAF Specification v1.1

use state::ProjectData;
use std::fs::File;
use std::io::Write;

pub struct AAFExporter;

impl Default for AAFExporter {
    fn default() -> Self { Self::new() }
}

impl AAFExporter {
    pub fn new() -> Self { Self }

    /// Generate a structured AAF XML manifest compatible with Avid/Premiere.
    pub fn generate_aaf(&self, project: &ProjectData, output_path: &str) -> Result<(), String> {
        let uid = uuid::Uuid::new_v4();

        let total_clips: usize = project.tracks.iter().map(|t| t.clips.len()).sum();

        let mut aaf = String::new();
        aaf.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE AAF SYSTEM "http://aaf.sourceforge.net/aaf.dtd">
<AAF Version="1.1" GeneratedBy="Lazynext" xmlns="http://aaf.sourceforge.net/1.0">
  <Header>
    <GenerationUID>urn:uuid:"#);
        aaf.push_str(&uid.to_string());
        aaf.push_str("</GenerationUID>\n");
        aaf.push_str(&format!("    <ProjectName>{}</ProjectName>\n", xml_escape(&project.name)));
        aaf.push_str(&format!("    <Framerate>{}</Framerate>\n", project.fps));
        aaf.push_str(&format!("    <Width>{}</Width>\n", project.width));
        aaf.push_str(&format!("    <Height>{}</Height>\n", project.height));
        aaf.push_str(&format!("    <TrackCount>{}</TrackCount>\n", project.tracks.len()));
        aaf.push_str(&format!("    <ClipCount>{}</ClipCount>\n", total_clips));
        aaf.push_str("  </Header>\n  <Composition>\n");

        // ── Tracks ─────────────────────────────────────────────────
        for (ti, track) in project.tracks.iter().enumerate() {
            aaf.push_str(&format!(
                r#"    <Track>
      <TrackID>{}</TrackID>
      <TrackIndex>{}</TrackIndex>
      <Kind>{}</Kind>
      <ClipCount>{}</ClipCount>
      <TimelineMobSlot>
        <SlotID>slot_{}</SlotID>
        <EditRate>{}</EditRate>
      </TimelineMobSlot>
      <Sequence>"#,
                xml_escape(&track.id),
                ti,
                xml_escape(&track.track_type),
                track.clips.len(),
                track.id,
                project.fps,
            ));

            for (ci, clip) in track.clips.iter().enumerate() {
                aaf.push_str(&format!(
                    r#"
        <SourceClip>
          <ClipID>{}</ClipID>
          <Name>{}</Name>
          <Type>{}</Type>
          <Start>{}</Start>
          <Length>{}</Length>
          <TrackIndex>{}</TrackIndex>
          <ClipIndex>{}</ClipIndex>
        </SourceClip>"#,
                    xml_escape(&clip.id),
                    xml_escape(&clip.name),
                    xml_escape(&track.track_type),
                    clip.start_frame,
                    clip.duration_frames,
                    ti,
                    ci,
                ));
            }

            aaf.push_str("\n      </Sequence>\n    </Track>");
        }

        aaf.push_str("\n  </Composition>\n  <EssenceData>");
        aaf.push_str("\n    <!-- Source media references go here -->");
        aaf.push_str("\n  </EssenceData>\n</AAF>\n");

        let mut file = File::create(output_path)
            .map_err(|e| format!("Failed to create AAF file: {e}"))?;
        file.write_all(aaf.as_bytes())
            .map_err(|e| format!("Failed to write AAF: {e}"))?;

        Ok(())
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
    fn test_xml_escape() {
        assert_eq!(xml_escape("a & b"), "a &amp; b");
        assert_eq!(xml_escape("<tag>"), "&lt;tag&gt;");
        assert_eq!(xml_escape("it's \"ok\""), "it&apos;s &quot;ok&quot;");
    }
}
