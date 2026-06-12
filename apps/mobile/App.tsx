import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';

// In a real environment, this would import from the UniFFI generated bindings:
// import { MobileNLEBridge } from 'lazynext-core-native';
const MockNativeBridge = {
  get_project_name: () => "Mobile Edit (CRDT Synced)",
  get_track_count: () => 2,
};

export default function App() {
  const [projectName, setProjectName] = useState('Loading...');
  const [trackCount, setTrackCount] = useState(0);

  useEffect(() => {
    // Simulate fetching state synchronously from the Rust NLE Core via JNI/FFI
    setProjectName(MockNativeBridge.get_project_name());
    setTrackCount(MockNativeBridge.get_track_count());
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      
      <View style={styles.header}>
        <Text style={styles.title}>LAZYNEXT<Text style={styles.cyan}>.</Text></Text>
        <Text style={styles.subtitle}>Mobile Native Shell</Text>
      </View>

      <View style={styles.timeline}>
        <Text style={styles.projectText}>Project: {projectName}</Text>
        <Text style={styles.statsText}>{trackCount} Active Tracks from Rust Core</Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Open Mobile Timeline</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b', // Zinc 950
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  cyan: {
    color: '#22d3ee',
  },
  subtitle: {
    color: '#a1a1aa',
    marginTop: 4,
  },
  timeline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  projectText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsText: {
    color: '#22d3ee',
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  buttonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
