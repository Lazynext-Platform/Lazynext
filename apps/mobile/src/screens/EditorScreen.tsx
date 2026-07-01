/** @module screens/EditorScreen Editor screen component for mobile */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { NativeBridge } from '../NativeBridge';

const { width } = Dimensions.get('window');

interface Clip {
  id: string;
  name: string;
  start: number;
  end: number;
}

export const EditorScreen = () => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    NativeBridge.fetchProject().then((project) => {
      setProjectName(project.name);
      const allClips: Clip[] = [];
      for (const track of project.tracks) {
        for (const c of track.clips) {
          allClips.push({
            id: c.id,
            name: c.name,
            start: c.start,
            end: c.start + (c.duration ?? 100),
          });
        }
      }
      setClips(allClips);
    });
  }, []);

  const handleImportMedia = () => {
    console.log("Import Media pressed — expo-image-picker not yet integrated.");
    Alert.alert(
      "Import Media",
      "Media import will be available when expo-image-picker is integrated.\n\nYou can also use the Chronos Copilot tab to generate B-roll or add clips via natural language."
    );
  };

  const clipCount = clips.length;

  return (
    <View style={styles.container}>
      
      {/* Video Preview Area */}
      <View style={styles.previewContainer}>
        <View style={styles.previewBox}>
          <Text style={styles.previewProjectName}>{projectName || 'No Project Open'}</Text>
          <Text style={styles.previewMeta}>
            {clipCount} clip{clipCount !== 1 ? 's' : ''} on timeline
          </Text>
        </View>
      </View>

      {/* Editor Controls / Timeline */}
      <View style={styles.editorContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{projectName || 'TIMELINE'}</Text>
          <Text style={styles.headerFrame}>Frame: {currentFrame}</Text>
        </View>

        <TouchableOpacity style={styles.importButton} onPress={handleImportMedia}>
          <Text style={styles.importButtonText}>Import Media</Text>
        </TouchableOpacity>

        <ScrollView horizontal style={styles.timelineScroll} showsHorizontalScrollIndicator={false}>
          <View style={[styles.timelineTrack, { width: 1000 }]}>
            
            {/* Playhead */}
            <View style={[styles.playhead, { left: currentFrame * 2 }]} />

            {/* Clips */}
            {clips.map(clip => (
              <TouchableOpacity 
                key={clip.id} 
                style={[styles.clip, { left: clip.start * 2, width: (clip.end - clip.start) * 2 }]}
              >
                <Text style={styles.clipText}>{clip.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c', // Dark premium background
  },
  previewContainer: {
    flex: 0.6,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 300,
    backgroundColor: '#0d0d1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewProjectName: {
    color: '#e0e0ff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewMeta: {
    color: 'rgba(160, 160, 200, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  editorContainer: {
    flex: 0.4,
    backgroundColor: 'rgba(25, 25, 30, 0.95)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#a0a0b0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerFrame: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Menlo',
  },
  timelineScroll: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  timelineTrack: {
    height: 80,
    position: 'relative',
    paddingVertical: 10,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ec4899', // Pink accent
    zIndex: 10,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  clip: {
    position: 'absolute',
    height: 40,
    top: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.4)', // Indigo Glass
    borderColor: 'rgba(99, 102, 241, 0.8)',
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  importButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  importButtonText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  }
});
