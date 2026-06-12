import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TVEventHandler, useTVEventHandler } from 'react-native';

// In a real environment, this imports our native Rust bindings
const MockNativeBridge = {
  get_project_name: () => "Screening Room Alpha",
  get_playhead: () => 1420,
};

export default function App() {
  const [playhead, setPlayhead] = useState(0);

  // TV Remote Integration
  const myTVEventHandler = (evt: any) => {
    if (evt && evt.eventType === 'right') {
      console.log('Siri Remote: Scrub Right');
    } else if (evt && evt.eventType === 'left') {
      console.log('Siri Remote: Scrub Left');
    } else if (evt && evt.eventType === 'select') {
      console.log('Siri Remote: Play/Pause');
    }
  };

  useTVEventHandler(myTVEventHandler);

  useEffect(() => {
    // Simulate real-time CRDT updates from the Mac editor across the network
    const interval = setInterval(() => {
      setPlayhead((prev) => prev + 1);
    }, 16); // 60fps
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.videoPlayer}>
        <Text style={styles.videoText}>Cinematic 4K Playback Engine</Text>
        <Text style={styles.timecode}>{Math.floor(playhead / 60)}:{(playhead % 60).toString().padStart(2, '0')}</Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.title}>LAZYNEXT<Text style={styles.cyan}>.</Text> BROADCAST</Text>
        <Text style={styles.subtitle}>Session: {MockNativeBridge.get_project_name()}</Text>
        <Text style={styles.instructions}>Use Siri Remote to scrub timeline</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black for OLED TVs
    justifyContent: 'space-between',
  },
  videoPlayer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  videoText: {
    color: '#3f3f46',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timecode: {
    color: '#22d3ee',
    fontSize: 96,
    fontWeight: '300',
    marginTop: 20,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    padding: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: -1,
  },
  cyan: {
    color: '#22d3ee',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 24,
  },
  instructions: {
    color: '#52525b',
    fontSize: 18,
  }
});
