//! FCPXML XML serializer for DaVinci Resolve.
//!
//! Converts internal timeline representation to FCPXML 1.8 format.

use crate::types::{FcpxmlConfig, FcpxmlDocument, FormatInfo, Resource, ResourceType, Timeline, Track, TrackType, Clip};
use editor_core::models::{Project, MediaItem};
use quick_xml::events::{BytesDecl, BytesEnd, BytesStart, BytesText, Event};
use quick_xml::Writer;
use std::io::Write;
use uuid::Uuid;

/// FCPXML Exporter that converts Lazynext timelines to FCPXML format
pub struct FcpxmlExporter {
    config: FcpxmlConfig,
}

impl FcpxmlExporter {
    /// Create a new FCPXML exporter with the given configuration
    pub fn new(config: FcpxmlConfig) -> Self {
        Self { config }
    }

    /// Export a project to FCPXML file
    pub fn export(
        &self,
        project: &Project,
        output_path: &str,
        _media_folder: &str,
    ) -> anyhow::Result<()> {
        // Build FCPXML document from project
        let document = self.build_document(project);
        
        // Serialize to XML
        let xml_content = self.serialize_to_xml(&document)?;
        
        // Write to file
        std::fs::write(output_path, xml_content)?;
        
        Ok(())
    }

    /// Build FCPXML document structure from project
    fn build_document(&self, project: &Project) -> FcpxmlDocument {
        let mut resources = Vec::new();
        let mut video_tracks = Vec::new();
        let mut audio_tracks = Vec::new();
        
        // Process each track in the project
        for (track_idx, track) in project.tracks.iter().enumerate() {
            let mut clips = Vec::new();
            
            for item in &track.items {
                // Generate unique resource ID
                let resource_id = Uuid::new_v4().to_string();
                
                // Determine if this is video or audio based on file extension
                let is_audio = self.is_audio_file(&item.source_path);
                
                // Add resource
                resources.push(Resource {
                    id: resource_id.clone(),
                    name: item.id.clone(),
                    path: self.resolve_media_path(&item.source_path),
                    resource_type: if is_audio { 
                        ResourceType::Audio 
                    } else { 
                        ResourceType::Video 
                    },
                });
                
                // Add clip to appropriate track
                clips.push(Clip {
                    id: item.id.clone(),
                    name: format!("Clip_{}", item.id),
                    resource_id,
                    start: 0.0, // Start from beginning of source
                    duration: item.duration,
                    offset: item.start_time,
                });
            }
            
            // For now, treat first track as video, rest as audio
            // In real implementation, would check track metadata
            if track_idx == 0 {
                video_tracks.push(Track {
                    id: format!("video_track_{}", track_idx),
                    track_type: TrackType::Video,
                    clips,
                });
            } else if self.config.include_audio {
                audio_tracks.push(Track {
                    id: format!("audio_track_{}", track_idx),
                    track_type: TrackType::Audio,
                    clips,
                });
            }
        }
        
        let mut all_tracks = video_tracks;
        all_tracks.extend(audio_tracks);
        
        FcpxmlDocument {
            version: "1.8".to_string(),
            project_name: self.config.project_name.clone(),
            format: FormatInfo {
                width: self.config.width,
                height: self.config.height,
                frame_rate_num: self.config.frame_rate_num,
                frame_rate_den: self.config.frame_rate_den,
            },
            resources,
            timeline: Timeline {
                tracks: all_tracks,
            },
        }
    }

    /// Serialize FCPXML document to XML string
    fn serialize_to_xml(&self, doc: &FcpxmlDocument) -> anyhow::Result<String> {
        let mut writer = Writer::new_with_indent(Vec::new(), b' ', 2);
        
        // XML declaration
        let decl = BytesDecl::new("1.0", Some("UTF-8"), None);
        writer.write_event(Event::Decl(decl))?;
        
        // Root element: fcpxml
        let mut root = BytesStart::new("fcpxml");
        root.push_attribute(("version", doc.version.as_str()));
        writer.write_event(Event::Start(root))?;
        
        // Resources section
        writer.write_event(Event::Start(BytesStart::new("resources")))?;
        for resource in &doc.resources {
            let mut res_elem = BytesStart::new("resource");
            res_elem.push_attribute(("id", resource.id.as_str()));
            res_elem.push_attribute(("name", resource.name.as_str()));
            res_elem.push_attribute(("path", resource.path.as_str()));
            res_elem.push_attribute(("type", match resource.resource_type {
                ResourceType::Video => "video",
                ResourceType::Audio => "audio",
            }));
            writer.write_event(Event::Empty(res_elem))?;
        }
        writer.write_event(Event::End(BytesEnd::new("resources")))?;
        
        // Timeline section
        writer.write_event(Event::Start(BytesStart::new("timeline")))?;
        
        // Sequence
        writer.write_event(Event::Start(BytesStart::new("sequence")))?;
        
        // Duration
        let total_duration = self.calculate_total_duration(doc);
        writer.write_event(Event::Start(BytesStart::new("duration")))?;
        writer.write_event(Event::Text(BytesText::new(&total_duration.to_string())))?;
        writer.write_event(Event::End(BytesEnd::new("duration")))?;
        
        // Tracks
        for track in &doc.timeline.tracks {
            writer.write_event(Event::Start(BytesStart::new("track")))?;
            
            for clip in &track.clips {
                writer.write_event(Event::Start(BytesStart::new("clip")))?;
                
                // Name
                writer.write_event(Event::Start(BytesStart::new("name")))?;
                writer.write_event(Event::Text(BytesText::new(&clip.name)))?;
                writer.write_event(Event::End(BytesEnd::new("name")))?;
                
                // Resource reference
                let mut asset_ref = BytesStart::new("asset-ref");
                asset_ref.push_attribute(("id", clip.resource_id.as_str()));
                writer.write_event(Event::Empty(asset_ref))?;
                
                // Timing
                writer.write_event(Event::Start(BytesStart::new("offset")))?;
                writer.write_event(Event::Text(BytesText::new(&clip.offset.to_string())))?;
                writer.write_event(Event::End(BytesEnd::new("offset")))?;
                
                writer.write_event(Event::Start(BytesStart::new("duration")))?;
                writer.write_event(Event::Text(BytesText::new(&clip.duration.to_string())))?;
                writer.write_event(Event::End(BytesEnd::new("duration")))?;
                
                writer.write_event(Event::End(BytesEnd::new("clip")))?;
            }
            
            writer.write_event(Event::End(BytesEnd::new("track")))?;
        }
        
        writer.write_event(Event::End(BytesEnd::new("sequence")))?;
        writer.write_event(Event::End(BytesEnd::new("timeline")))?;
        
        // Close root
        writer.write_event(Event::End(BytesEnd::new("fcpxml")))?;
        
        // Convert to string
        let result = String::from_utf8(writer.into_inner())?;
        Ok(result)
    }

    /// Calculate total timeline duration
    fn calculate_total_duration(&self, doc: &FcpxmlDocument) -> f64 {
        doc.timeline.tracks.iter()
            .flat_map(|t| t.clips.iter().map(|c| c.offset + c.duration))
            .fold(0.0f64, |a, b| a.max(b))
    }

    /// Check if file is audio based on extension
    fn is_audio_file(&self, path: &str) -> bool {
        let ext = std::path::Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        
        matches!(ext.as_str(), "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a")
    }

    /// Resolve media path based on config
    fn resolve_media_path(&self, source_path: &str) -> String {
        match self.config.media_link_mode {
            crate::types::MediaLinkMode::Relative => {
                // Extract filename and return relative to media base path
                std::path::Path::new(source_path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| format!("{}/{}", self.config.media_base_path, n))
                    .unwrap_or_else(|| source_path.to_string())
            }
            crate::types::MediaLinkMode::Absolute => {
                source_path.to_string()
            }
            crate::types::MediaLinkMode::FileUri => {
                format!("file://{}", source_path)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use editor_core::models::{Project, Track, MediaItem};

    #[test]
    fn test_basic_export() {
        let project = Project {
            id: "test-project".to_string(),
            name: "Test Project".to_string(),
            tracks: vec![
                Track {
                    id: "track1".to_string(),
                    items: vec![
                        MediaItem {
                            id: "clip1".to_string(),
                            source_path: "/media/video.mp4".to_string(),
                            start_time: 0.0,
                            duration: 5.0,
                        },
                        MediaItem {
                            id: "clip2".to_string(),
                            source_path: "/media/video2.mp4".to_string(),
                            start_time: 5.0,
                            duration: 3.0,
                        },
                    ],
                },
            ],
        };

        let config = FcpxmlConfig {
            project_name: "Test Export".to_string(),
            ..Default::default()
        };

        let exporter = FcpxmlExporter::new(config);
        let result = exporter.export(&project, "/tmp/test.fcpxml", "/media");
        
        assert!(result.is_ok());
        
        // Verify file was created
        assert!(std::path::Path::new("/tmp/test.fcpxml").exists());
        
        // Clean up
        let _ = std::fs::remove_file("/tmp/test.fcpxml");
    }
}
