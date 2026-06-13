import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput } from 'react-native';

// In a real environment, this would import from the UniFFI generated bindings:
// import { MobileNLEBridge } from 'lazynext-core-native';
const MockNativeBridge = {
  get_project_name: () => "Mobile Edit (CRDT Synced)",
  get_track_count: () => 2,
  process_intent: (prompt: string) => {
    if (prompt.toLowerCase().includes("cut")) return "Autonomously trimmed the footage.";
    if (prompt.toLowerCase().includes("music")) return "Autonomously added cinematic background music.";
    return "Autonomously processed your prompt and edited the timeline.";
  }
};

export default function App() {
  const [projectName, setProjectName] = useState('Loading...');
  const [trackCount, setTrackCount] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('Awaiting natural language edit...');

  useEffect(() => {
    // Simulate fetching state synchronously from the Rust NLE Core via JNI/FFI
    setProjectName(MockNativeBridge.get_project_name());
    setTrackCount(MockNativeBridge.get_track_count());
  }, []);

  const handleProcessIntent = () => {
    if (!prompt) return;
    setStatus('Processing via Rust Core...');
    setTimeout(() => {
      const result = MockNativeBridge.process_intent(prompt);
      setStatus(`Success: ${result}`);
      // Simulate that the clip count was increased by the AI
      setTrackCount(prev => prev + 1);
      setPrompt('');
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      <View style={styles.header}>
        <Text style={styles.title}>LAZYNEXT<Text style={styles.cyan}>.</Text></Text>
        <Text style={styles.subtitle}>Mobile Native Shell</Text>
      </View>

      <View style={styles.timeline}>
        <View style={styles.glassPanel}>
          <Text style={styles.projectText}>{projectName}</Text>
          <Text style={styles.statsText}>{trackCount} Clips Loaded via Core Logic</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Type 'cut' or 'add music'..."
          placeholderTextColor="#52525b"
          value={prompt}
          onChangeText={setPrompt}
        />
        <TouchableOpacity style={styles.button} onPress={handleProcessIntent}>
          <Text style={styles.buttonText}>AI Edit</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505', // Deep Charcoal
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  cyan: {
    color: '#00e5ff',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontWeight: '600',
  },
  timeline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glassPanel: {
    backgroundColor: 'rgba(24,24,27,0.5)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  projectText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsText: {
    color: '#00e5ff',
    fontSize: 16,
    marginBottom: 32,
    fontWeight: '600',
  },
  statusText: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  inputContainer: {
    padding: 24,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(24,24,27,0.5)',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  button: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#050505',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
