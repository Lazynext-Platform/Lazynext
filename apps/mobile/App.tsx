import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";

/**
 * Mobile Native Bridge — connects to the Rust core via UniFFI-generated bindings.
 *
 * In production, this uses:
 *   import { MobileNLEBridge } from 'lazynext-core-native';
 *
 * The Rust core functions are:
 *   - get_project_name() -> String
 *   - get_track_count() -> u32
 *   - process_intent(prompt: String) -> Result<String, String>
 *   - get_project_data_json() -> String (full CRDT state)
 *   - add_clip(track_idx: u32, name: String, start: u32, end: u32) -> bool
 */

// UniFFI bridge — uncomment when native modules are built:
// import { NativeModules } from 'react-native';
// const { LazynextCore } = NativeModules;

const NativeBridge = {
  get_project_name: (): string => {
    // In production: return LazynextCore.getProjectName()
    return "Mobile CRDT Session";
  },
  get_track_count: (): number => {
    // In production: return LazynextCore.getTrackCount()
    return 3;
  },
  process_intent: (prompt: string): string => {
    // In production: return LazynextCore.processIntent(prompt)
    if (prompt.toLowerCase().includes("cut"))
      return "Trimmed silence from audio tracks.";
    if (prompt.toLowerCase().includes("music"))
      return "Added cinematic background score.";
    if (prompt.toLowerCase().includes("color"))
      return "Applied teal-orange color grade.";
    return "Processed timeline via AI engine.";
  },
};

export default function App() {
  const [projectName, setProjectName] = useState("Loading...");
  const [trackCount, setTrackCount] = useState(0);
  const [clipCount, setClipCount] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Ready");
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isApplePencil, setIsApplePencil] = useState(false);

  useEffect(() => {
    setProjectName(NativeBridge.get_project_name());
    setTrackCount(NativeBridge.get_track_count());
    setClipCount(NativeBridge.get_track_count() * 2); // mock clip count
  }, []);

  // Detect Apple Pencil / Stylus hover or touch
  const handleTouchStart = (e: any) => {
    if (e.nativeEvent?.touches?.[0]?.force !== undefined) {
      // Basic heuristic for Stylus/Apple Pencil on iOS/iPadOS
      setIsApplePencil(true);
    }
  };

  const handleProcessIntent = () => {
    if (!prompt.trim()) return;
    setProcessing(true);
    setStatus("Processing via Rust Core...");

    // Simulate async FFI call
    setTimeout(() => {
      const result = NativeBridge.process_intent(prompt);
      setStatus(`✓ ${result}`);
      setClipCount((prev) => prev + 1);
      setHistory((prev) => [prompt, ...prev].slice(0, 10));
      setPrompt("");
      setProcessing(false);
    }, 600);
  };

  const quickActions = ["Cut silence", "Add music", "Color grade", "Generate B-roll"];

  return (
    <SafeAreaView style={styles.container} onTouchStart={handleTouchStart}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      <View style={styles.header}>
        <Text style={styles.title}>
          LAZYNEXT<Text style={styles.cyan}>.</Text>
        </Text>
        <Text style={styles.subtitle}>Mobile NLE Shell</Text>
        {isApplePencil && (
          <Text style={{ color: "#00e5ff", fontSize: 12, marginTop: 4 }}>
            Apple Pencil Detected
          </Text>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Project info card */}
        <View style={styles.glassPanel}>
          <Text style={styles.projectText}>{projectName}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{trackCount}</Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{clipCount}</Text>
              <Text style={styles.statLabel}>Clips</Text>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          {processing && <ActivityIndicator color="#f59e0b" size="small" />}
          <Text
            style={[
              styles.statusText,
              { color: processing ? "#f59e0b" : "#10b981" },
            ]}
          >
            {status}
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action}
              style={styles.quickActionBtn}
              onPress={() => {
                setPrompt(action);
                handleProcessIntent();
              }}
            >
              <Text style={styles.quickActionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent commands */}
        {history.length > 0 && (
          <View style={styles.historyPanel}>
            <Text style={styles.historyTitle}>Recent</Text>
            {history.map((cmd, i) => (
              <Text key={i} style={styles.historyItem}>
                → {cmd}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder='Try "cut silence" or "add music"...'
          placeholderTextColor="#52525b"
          value={prompt}
          onChangeText={setPrompt}
          onSubmitEditing={handleProcessIntent}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.button, !prompt.trim() && styles.buttonDisabled]}
          onPress={handleProcessIntent}
          disabled={!prompt.trim() || processing}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: { padding: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  title: { fontSize: 32, fontWeight: "900", color: "#ffffff", letterSpacing: -1 },
  cyan: { color: "#00e5ff" },
  subtitle: { color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "600" },
  content: { flex: 1 },
  contentInner: { padding: 24, gap: 16 },
  glassPanel: {
    backgroundColor: "rgba(24,24,27,0.5)", borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderRadius: 24, padding: 24, alignItems: "center",
  },
  projectText: { color: "#ffffff", fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 32 },
  stat: { alignItems: "center" },
  statValue: { color: "#00e5ff", fontSize: 28, fontWeight: "bold" },
  statLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  statusText: { fontSize: 14 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickActionBtn: {
    backgroundColor: "rgba(24,24,27,0.5)", borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  quickActionText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  historyPanel: {
    backgroundColor: "rgba(24,24,27,0.3)", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  historyTitle: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 },
  historyItem: { color: "rgba(255,255,255,0.7)", fontSize: 13, paddingVertical: 2 },
  inputContainer: {
    padding: 24, flexDirection: "row", gap: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1, backgroundColor: "rgba(24,24,27,0.5)", color: "#ffffff",
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", fontSize: 16,
  },
  button: {
    backgroundColor: "#00e5ff", paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#050505", fontWeight: "bold", fontSize: 16 },
});
