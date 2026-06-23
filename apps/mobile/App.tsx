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
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// UniFFI bridge mockup
const NativeBridge = {
  get_project_name: (): string => {
    return "Mobile CRDT Session";
  },
  get_track_count: (): number => {
    return 3;
  },
  process_intent: (prompt: string): string => {
    if (prompt.toLowerCase().includes("cut"))
      return "Trimmed silence from audio tracks.";
    if (prompt.toLowerCase().includes("music"))
      return "Added cinematic background score.";
    if (prompt.toLowerCase().includes("color"))
      return "Applied teal-orange color grade.";
    return "Processed timeline via AI engine.";
  },
};

function DashboardScreen() {
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
    setClipCount(NativeBridge.get_track_count() * 2);
  }, []);

  const handleTouchStart = (e: any) => {
    if (e.nativeEvent?.touches?.[0]?.force !== undefined) {
      setIsApplePencil(true);
    }
  };

  const handleProcessIntent = () => {
    if (!prompt.trim()) return;
    setProcessing(true);
    setStatus("Processing via Rust Core...");

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

function AIChatScreen() {
  return (
    <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>AI Copilot Chat</Text>
      <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 8 }}>Ask complex production questions here.</Text>
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#050505",
            borderTopColor: "rgba(255,255,255,0.08)",
          },
          tabBarActiveTintColor: "#00e5ff",
          tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="AI Copilot" component={AIChatScreen} />
      </Tab.Navigator>
    </NavigationContainer>
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
