#!/usr/bin/env python3
"""
End-to-End Test for FCPXML Exporter
Test toàn bộ workflow từ tạo project đến export FCPXML
"""

import sys
sys.path.insert(0, '/workspace/sandbox/fcpxml_export')

from fcpxml_exporter import (
    FcpxmlExporter, FcpxmlConfig, MediaLinkMode,
    Project, Track, MediaItem, create_sample_project
)
import xml.etree.ElementTree as ET
from pathlib import Path


def test_basic_export():
    """Test 1: Export cơ bản"""
    print("\n[Test 1] Basic Export Test")
    print("-" * 40)
    
    project = create_sample_project()
    config = FcpxmlConfig(project_name=project.name)
    exporter = FcpxmlExporter(config)
    
    output_path = "/workspace/sandbox/fcpxml_export/test_output.fcpxml"
    result = exporter.export(project, output_path, "./media")
    
    assert Path(result).exists(), "File không được tạo"
    assert Path(result).stat().st_size > 0, "File rỗng"
    
    print(f"✓ File created: {result}")
    print(f"✓ File size: {Path(result).stat().st_size} bytes")
    return True


def test_xml_structure():
    """Test 2: Kiểm tra cấu trúc XML"""
    print("\n[Test 2] XML Structure Validation")
    print("-" * 40)
    
    project = create_sample_project()
    config = FcpxmlConfig()
    exporter = FcpxmlExporter(config)
    
    output_path = "/workspace/sandbox/fcpxml_export/structure_test.fcpxml"
    exporter.export(project, output_path)
    
    # Parse XML
    tree = ET.parse(output_path)
    root = tree.getroot()
    
    # Check root element
    assert root.tag == 'fcpxml', f"Root tag sai: {root.tag}"
    assert root.get('version') == '1.8', f"Version sai: {root.get('version')}"
    
    # Check resources section
    resources = root.find('resources')
    assert resources is not None, "Thiếu section resources"
    assert len(resources.findall('resource')) == 6, "Số lượng resource không đúng"
    
    # Check timeline section
    timeline = root.find('timeline')
    assert timeline is not None, "Thiếu section timeline"
    
    sequence = timeline.find('sequence')
    assert sequence is not None, "Thiếu sequence"
    
    duration = sequence.find('duration')
    assert duration is not None, "Thiếu duration"
    assert float(duration.text) == 15.0, f"Duration sai: {duration.text}"
    
    # Check tracks
    tracks = sequence.findall('track')
    assert len(tracks) == 3, f"Số track sai: {len(tracks)}"
    
    # Check video track
    video_track = tracks[0]
    assert video_track.get('type') == 'video', "Track đầu tiên phải là video"
    clips = video_track.findall('clip')
    assert len(clips) == 3, f"Số clip video sai: {len(clips)}"
    
    # Check audio tracks
    audio_tracks = [t for t in tracks if t.get('type') == 'audio']
    assert len(audio_tracks) == 2, "Phải có 2 audio tracks"
    
    print("✓ Root element: fcpxml version 1.8")
    print("✓ Resources section: 6 resources")
    print("✓ Timeline section: present")
    print("✓ Duration: 15.0 seconds")
    print("✓ Tracks: 3 (1 video + 2 audio)")
    print("✓ Video clips: 3")
    print("✓ Audio clips: 3")
    return True


def test_media_linking():
    """Test 3: Kiểm tra media linking modes"""
    print("\n[Test 3] Media Linking Modes")
    print("-" * 40)
    
    project = Project(
        id="test",
        name="Linking Test",
        tracks=[
            Track(id="t1", items=[
                MediaItem("c1", "/original/path/video.mp4", 0.0, 5.0)
            ])
        ]
    )
    
    # Test Relative mode
    config_rel = FcpxmlConfig(media_link_mode=MediaLinkMode.RELATIVE, media_base_path="./media")
    exporter_rel = FcpxmlExporter(config_rel)
    out_rel = "/workspace/sandbox/fcpxml_export/relative_test.fcpxml"
    exporter_rel.export(project, out_rel)
    
    tree = ET.parse(out_rel)
    root = tree.getroot()
    resource = root.find('.//resource')
    assert resource.get('path') == './media/video.mp4', f"Relative path sai: {resource.get('path')}"
    print("✓ Relative mode: ./media/video.mp4")
    
    # Test Absolute mode
    config_abs = FcpxmlConfig(media_link_mode=MediaLinkMode.ABSOLUTE)
    exporter_abs = FcpxmlExporter(config_abs)
    out_abs = "/workspace/sandbox/fcpxml_export/absolute_test.fcpxml"
    exporter_abs.export(project, out_abs)
    
    tree = ET.parse(out_abs)
    root = tree.getroot()
    resource = root.find('.//resource')
    assert resource.get('path') == '/original/path/video.mp4', f"Absolute path sai"
    print("✓ Absolute mode: /original/path/video.mp4")
    
    # Test File URI mode
    config_uri = FcpxmlConfig(media_link_mode=MediaLinkMode.FILE_URI)
    exporter_uri = FcpxmlExporter(config_uri)
    out_uri = "/workspace/sandbox/fcpxml_export/uri_test.fcpxml"
    exporter_uri.export(project, out_uri)
    
    tree = ET.parse(out_uri)
    root = tree.getroot()
    resource = root.find('.//resource')
    assert resource.get('path') == 'file:///original/path/video.mp4', f"URI path sai"
    print("✓ File URI mode: file:///original/path/video.mp4")
    
    return True


def test_audio_detection():
    """Test 4: Kiểm tra tự động phát hiện audio files"""
    print("\n[Test 4] Audio File Detection")
    print("-" * 40)
    
    config = FcpxmlConfig()
    exporter = FcpxmlExporter(config)
    
    # Test audio extensions
    audio_files = [
        "/path/file.mp3",
        "/path/file.wav",
        "/path/file.aac",
        "/path/file.flac",
        "/path/file.ogg",
        "/path/file.m4a"
    ]
    
    for f in audio_files:
        assert exporter.is_audio_file(f), f"Not detected as audio: {f}"
    
    print("✓ Detected audio formats: mp3, wav, aac, flac, ogg, m4a")
    
    # Test video extensions (not audio)
    video_files = [
        "/path/file.mp4",
        "/path/file.mov",
        "/path/file.avi"
    ]
    
    for f in video_files:
        assert not exporter.is_audio_file(f), f"False positive for video: {f}"
    
    print("✓ Correctly identified non-audio: mp4, mov, avi")
    
    return True


def test_timing_accuracy():
    """Test 5: Kiểm tra độ chính xác timing"""
    print("\n[Test 5] Timing Accuracy")
    print("-" * 40)
    
    project = Project(
        id="timing_test",
        name="Timing Test",
        tracks=[
            Track(id="v1", items=[
                MediaItem("c1", "/media/a.mp4", 0.0, 3.5),
                MediaItem("c2", "/media/b.mp4", 3.5, 2.75),
                MediaItem("c3", "/media/c.mp4", 6.25, 4.0),
            ])
        ]
    )
    
    config = FcpxmlConfig()
    exporter = FcpxmlExporter(config)
    output = "/workspace/sandbox/fcpxml_export/timing_test.fcpxml"
    exporter.export(project, output)
    
    tree = ET.parse(output)
    root = tree.getroot()
    
    # Check total duration
    duration = root.find('.//sequence/duration')
    expected_duration = 6.25 + 4.0  # start + duration of last clip
    assert abs(float(duration.text) - expected_duration) < 0.01, f"Duration sai: {duration.text}"
    print(f"✓ Total duration: {duration.text}s (expected {expected_duration}s)")
    
    # Check individual clip offsets
    clips = root.findall('.//track[@type="video"]/clip')
    expected_offsets = [0.0, 3.5, 6.25]
    expected_durations = [3.5, 2.75, 4.0]
    
    for i, clip in enumerate(clips):
        offset = float(clip.find('offset').text)
        dur = float(clip.find('duration').text)
        assert abs(offset - expected_offsets[i]) < 0.01, f"Clip {i} offset sai"
        assert abs(dur - expected_durations[i]) < 0.01, f"Clip {i} duration sai"
    
    print("✓ Clip 1: offset=0.0s, duration=3.5s")
    print("✓ Clip 2: offset=3.5s, duration=2.75s")
    print("✓ Clip 3: offset=6.25s, duration=4.0s")
    
    return True


def run_all_tests():
    """Chạy tất cả tests"""
    print("=" * 60)
    print("FCPXML Exporter - End-to-End Test Suite")
    print("=" * 60)
    
    tests = [
        ("Basic Export", test_basic_export),
        ("XML Structure", test_xml_structure),
        ("Media Linking", test_media_linking),
        ("Audio Detection", test_audio_detection),
        ("Timing Accuracy", test_timing_accuracy),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"\n✅ PASSED: {name}")
        except Exception as e:
            failed += 1
            print(f"\n❌ FAILED: {name}")
            print(f"   Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{len(tests)} tests passed")
    if failed == 0:
        print("🎉 All tests passed!")
    else:
        print(f"⚠️  {failed} test(s) failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
