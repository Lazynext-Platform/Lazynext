import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

// Simulating the UniFFI Rust bindings
interface Clip {
  id: string;
  name: string;
  start: number;
  end: number;
}

export const EditorScreen = () => {
  const [clips, setClips] = useState<Clip[]>([
    { id: '1', name: 'Intro', start: 0, end: 100 },
    { id: '2', name: 'Main Action', start: 100, end: 300 },
  ]);
  const [currentFrame, setCurrentFrame] = useState(0);

  return (
    <View style={styles.container}>
      
      {/* Video Preview Area */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewText}>Video Preview Render Surface (Rust WGPU)</Text>
      </View>

      {/* Editor Controls / Timeline */}
      <View style={styles.editorContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TIMELINE</Text>
          <Text style={styles.headerFrame}>Frame: {currentFrame}</Text>
        </View>

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
  },
  previewText: {
    color: '#333',
    fontWeight: 'bold',
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
  }
});
