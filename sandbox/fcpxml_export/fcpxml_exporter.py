#!/usr/bin/env python3
"""
FCPXML Exporter for DaVinci Resolve Studio
Export Lazynext timelines to FCPXML format for professional post-production
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
import json
import uuid
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class MediaLinkMode(Enum):
    RELATIVE = "relative"
    ABSOLUTE = "absolute"
    FILE_URI = "file_uri"


@dataclass
class MediaItem:
    id: str
    source_path: str
    start_time: float
    duration: float
    track_type: str = "video"  # video or audio


@dataclass
class Track:
    id: str
    items: List[MediaItem] = field(default_factory=list)


@dataclass
class Project:
    id: str
    name: str
    tracks: List[Track] = field(default_factory=list)


@dataclass
class FcpxmlConfig:
    project_name: str = "Lazynext Export"
    width: int = 1920
    height: int = 1080
    frame_rate_num: int = 30
    frame_rate_den: int = 1
    media_link_mode: MediaLinkMode = MediaLinkMode.RELATIVE
    media_base_path: str = "./media"
    include_audio: bool = True
    include_transforms: bool = True


class FcpxmlExporter:
    """Export Lazynext projects to FCPXML format for DaVinci Resolve"""
    
    def __init__(self, config: FcpxmlConfig):
        self.config = config
    
    def is_audio_file(self, path: str) -> bool:
        """Check if file is audio based on extension"""
        audio_exts = {'.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'}
        ext = Path(path).suffix.lower()
        return ext in audio_exts
    
    def resolve_media_path(self, source_path: str) -> str:
        """Resolve media path based on config mode"""
        if self.config.media_link_mode == MediaLinkMode.RELATIVE:
            filename = Path(source_path).name
            return f"{self.config.media_base_path}/{filename}"
        elif self.config.media_link_mode == MediaLinkMode.FILE_URI:
            return f"file://{source_path}"
        else:  # ABSOLUTE
            return source_path
    
    def export(self, project: Project, output_path: str, media_folder: str = None) -> str:
        """
        Export project to FCPXML file
        
        Args:
            project: Project containing timeline
            output_path: Path to write FCPXML file
            media_folder: Base path for media files
            
        Returns:
            Path to generated FCPXML file
        """
        if media_folder:
            self.config.media_base_path = media_folder
        
        # Build XML structure
        root = ET.Element('fcpxml')
        root.set('version', '1.8')
        
        # Resources section
        resources = ET.SubElement(root, 'resources')
        resource_map = {}  # Maps item_id to resource_id
        
        for track_idx, track in enumerate(project.tracks):
            for item in track.items:
                resource_id = str(uuid.uuid4())
                resource_map[item.id] = resource_id
                
                is_audio = self.is_audio_file(item.source_path) or item.track_type == "audio"
                res_type = "audio" if is_audio else "video"
                
                resource = ET.SubElement(resources, 'resource')
                resource.set('id', resource_id)
                resource.set('name', item.id)
                resource.set('path', self.resolve_media_path(item.source_path))
                resource.set('type', res_type)
        
        # Timeline section
        timeline = ET.SubElement(root, 'timeline')
        sequence = ET.SubElement(timeline, 'sequence')
        
        # Calculate total duration
        total_duration = 0.0
        for track in project.tracks:
            for item in track.items:
                end_time = item.start_time + item.duration
                total_duration = max(total_duration, end_time)
        
        duration_elem = ET.SubElement(sequence, 'duration')
        duration_elem.text = str(total_duration)
        
        # Tracks
        for track_idx, track in enumerate(project.tracks):
            track_elem = ET.SubElement(sequence, 'track')
            track_elem.set('id', f"track_{track_idx}")
            
            # Determine track type (first non-audio track is video)
            has_video = any(not self.is_audio_file(item.source_path) and item.track_type != "audio" 
                          for item in track.items)
            track_type = "video" if has_video else "audio"
            track_elem.set('type', track_type)
            
            for item in track.items:
                clip = ET.SubElement(track_elem, 'clip')
                clip.set('id', item.id)
                
                # Name
                name = ET.SubElement(clip, 'name')
                name.text = f"Clip_{item.id}"
                
                # Asset reference
                asset_ref = ET.SubElement(clip, 'asset-ref')
                asset_ref.set('id', resource_map[item.id])
                
                # Timing
                offset = ET.SubElement(clip, 'offset')
                offset.text = str(item.start_time)
                
                dur = ET.SubElement(clip, 'duration')
                dur.text = str(item.duration)
                
                # Start from beginning of source
                start = ET.SubElement(clip, 'start')
                start.text = "0"
        
        # Pretty print XML
        xml_str = ET.tostring(root, encoding='unicode')
        dom = minidom.parseString(xml_str)
        pretty_xml = dom.toprettyxml(indent='  ')
        
        # Remove extra blank lines
        lines = [line for line in pretty_xml.split('\n') if line.strip()]
        pretty_xml = '\n'.join(lines)
        
        # Add XML declaration properly
        final_xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + pretty_xml.split('\n', 1)[1]
        
        # Write to file
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_xml)
        
        return output_path


def create_sample_project() -> Project:
    """Create a sample project for testing"""
    return Project(
        id="proj_001",
        name="Pre-Wedding Demo",
        tracks=[
            Track(
                id="video_track_1",
                items=[
                    MediaItem("clip_001", "/media/wedding_intro.mp4", 0.0, 5.0, "video"),
                    MediaItem("clip_002", "/media/couple_walking.mp4", 5.0, 4.0, "video"),
                    MediaItem("clip_003", "/media/ring_exchange.mp4", 9.0, 6.0, "video"),
                ]
            ),
            Track(
                id="audio_track_1",
                items=[
                    MediaItem("music_001", "/media/romantic_music.mp3", 0.0, 15.0, "audio"),
                ]
            ),
            Track(
                id="audio_track_2",
                items=[
                    MediaItem("sfx_001", "/media/birds_ambient.wav", 0.0, 5.0, "audio"),
                    MediaItem("sfx_002", "/media/wind_ambient.wav", 5.0, 10.0, "audio"),
                ]
            ),
        ]
    )


def main():
    """Demo: Export sample project to FCPXML"""
    print("=" * 60)
    print("FCPXML Exporter for DaVinci Resolve - Demo")
    print("=" * 60)
    
    # Create sample project
    project = create_sample_project()
    print(f"\n✓ Created project: {project.name}")
    print(f"  - {len(project.tracks)} tracks")
    for i, track in enumerate(project.tracks):
        print(f"  - Track {i+1}: {len(track.items)} items")
    
    # Configure export
    config = FcpxmlConfig(
        project_name=project.name,
        width=1920,
        height=1080,
        frame_rate_num=30,
        frame_rate_den=1,
        media_link_mode=MediaLinkMode.RELATIVE,
        media_base_path="./media",
        include_audio=True,
    )
    
    # Export
    exporter = FcpxmlExporter(config)
    output_path = "/workspace/sandbox/fcpxml_export/output.fcpxml"
    
    result_path = exporter.export(project, output_path, "./media")
    print(f"\n✓ Exported to: {result_path}")
    
    # Display generated XML
    print("\n" + "=" * 60)
    print("Generated FCPXML (first 50 lines):")
    print("=" * 60)
    with open(result_path, 'r') as f:
        lines = f.readlines()
        for line in lines[:50]:
            print(line, end='')
        if len(lines) > 50:
            print(f"\n... ({len(lines) - 50} more lines)")
    
    print("\n" + "=" * 60)
    print("✓ Demo completed successfully!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Copy the .fcpxml file and media folder to DaVinci Resolve")
    print("2. In Resolve: File > Import > Timeline > Import AAF, EDL, XML...")
    print("3. Select the .fcpxml file")
    print("4. All clips will be linked from the media folder")
    print("5. Continue with color grading, VFX, and final mastering")


if __name__ == "__main__":
    main()
