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
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView, GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { NativeBridge } from "./src/NativeBridge";
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
    (async () => {
      const project = await NativeBridge.fetchProject();
      setProjectName(project.name);
      setTrackCount(project.tracks.length);
      setClipCount(project.tracks.reduce((acc, track) => acc + track.clips.length, 0));
    })();
  }, []);

  const handleTouchStart = (e: any) => {
    // Detect pressure-sensitive input (Apple Pencil or 3D Touch).
    // Clear the flag when no force is present (e.g. finger touch).
    if (e.nativeEvent?.touches?.[0]?.force !== undefined && e.nativeEvent.touches[0].force > 0) {
      setIsApplePencil(true);
      // Reset after 3s so the indicator doesn't stay forever
      const timer = setTimeout(() => setIsApplePencil(false), 3000);
      return () => clearTimeout(timer);
    }
  };

  const handleProcessIntent = async () => {
    if (!prompt.trim() || processing) return;
    const currentPrompt = prompt;
    setProcessing(true);
    setStatus("Processing via Rust Core...");
    setPrompt("");

    const result = await NativeBridge.processIntent(currentPrompt);
    setStatus(`✓ ${result}`);
    setHistory((prev) => [currentPrompt, ...prev].slice(0, 10));
    // Refresh project stats from server
    const project = await NativeBridge.fetchProject();
    setTrackCount(project.tracks.length);
    setClipCount(project.tracks.reduce((acc, track) => acc + track.clips.length, 0));
    setProcessing(false);
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
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Hi! I'm Chronos Copilot. Ask me to edit your video, generate B-roll, add effects, or anything else." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setSending(true);

    const reply = await NativeBridge.sendChatMessage(userMsg);
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    setSending(false);
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <View style={styles.chatHeader}>
        <Text style={styles.chatHeaderTitle}>Chronos Copilot</Text>
        <Text style={styles.chatHeaderSub}>AI Video Editor</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.chatBubble,
              item.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
            ]}
          >
            <Text style={item.role === "user" ? styles.chatTextUser : styles.chatTextAssistant}>
              {item.text}
            </Text>
          </View>
        )}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask me to edit your video..."
            placeholderTextColor="#52525b"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.chatSendBtn, (!input.trim() || sending) && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#050505" size="small" />
            ) : (
              <Text style={styles.buttonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
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
  // Chat styles
  chatHeader: { padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  chatHeaderTitle: { color: "#00e5ff", fontSize: 22, fontWeight: "bold" },
  chatHeaderSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },
  chatList: { flex: 1 },
  chatListContent: { padding: 16, gap: 12 },
  chatBubble: { maxWidth: "80%", padding: 14, borderRadius: 18 },
  chatBubbleUser: { alignSelf: "flex-end", backgroundColor: "#00e5ff" },
  chatBubbleAssistant: { alignSelf: "flex-start", backgroundColor: "rgba(24,24,27,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chatTextUser: { color: "#050505", fontSize: 15 },
  chatTextAssistant: { color: "#ffffff", fontSize: 15, lineHeight: 21 },
  chatInputContainer: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  chatInput: { flex: 1, backgroundColor: "rgba(24,24,27,0.5)", color: "#ffffff", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", fontSize: 16 },
  chatSendBtn: { backgroundColor: "#00e5ff", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, justifyContent: "center", alignItems: "center" },
});
