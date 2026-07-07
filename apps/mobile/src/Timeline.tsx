/** @module Timeline Timeline component for mobile */
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";

import { NativeBridge } from "./NativeBridge";

const DraggableClip = ({ clip, track, onMoveClip }: { clip: any, track: any, onMoveClip: (id: string, newStart: number) => void }) => {
  const isVideo = track.trackType === "video";
  const startX = (clip.start / 30) * 10;
  const width = (clip.duration / 30) * 10;

  const translateX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      isDragging.value = false;
      // Calculate new start
      const pixelDiff = e.translationX;
      const frameDiff = (pixelDiff / 10) * 30;
      const newStart = Math.max(0, clip.start + frameDiff);
      
      runOnJS(onMoveClip)(clip.id, Math.round(newStart));
      translateX.value = withSpring(0); // reset visual translation as state will update
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    zIndex: isDragging.value ? 100 : 1,
    opacity: isDragging.value ? 0.8 : 1,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.clip,
          isVideo ? styles.clipVideo : styles.clipAudio,
          { left: startX, width },
          animatedStyle
        ]}
      >
        <Text style={styles.clipText} numberOfLines={1}>{clip.name}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

/** Interactive timeline with draggable clips, mask gestures, and integration with NativeBridge. */
export function TimelineScreen() {
  const [projectName, setProjectName] = useState("Loading...");
  const [tracks, setTracks] = useState<Array<{ id: string; name: string; trackType: string; clips: Array<{ id: string; name: string; start: number; duration: number }> }>>([]);
  const [loading, setLoading] = useState(true);

  // Gesture state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);

  useEffect(() => {
    (async () => {
      const project = await NativeBridge.fetchProject();
      setProjectName(project.name);
      setTracks(project.tracks);
      setLoading(false);
    })();
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      offsetX.value = savedOffsetX.value + e.translationX;
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.1, Math.min(5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { scaleX: scale.value }
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      <View style={styles.timelineHeader}>
        <Text style={styles.timelineHeaderTitle}>Timeline</Text>
        <Text style={styles.timelineHeaderSub}>{projectName}</Text>
      </View>

      {loading ? (
        <View style={styles.timelineLoading}>
          <ActivityIndicator color="#00e5ff" size="large" />
          <Text style={styles.timelineLoadingText}>Loading tracks...</Text>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.timelineEmpty}>
          <Text style={styles.timelineEmptyText}>No tracks yet</Text>
          <Text style={styles.timelineEmptySub}>
            Tracks will appear here once added to the project.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <GestureDetector gesture={composedGestures}>
            <Animated.View style={[styles.timelineContainer, animatedStyle]}>
              {/* Playhead Placeholder */}
              <View style={styles.playhead} />

              {tracks.map((track) => (
                <View key={track.id} style={styles.trackRow}>
                  <View style={styles.trackHeader}>
                    <Text style={styles.trackHeaderText}>{track.name}</Text>
                  </View>
                  <View style={styles.trackContent}>
                    {track.clips.map((clip) => {
                      return (
                        <DraggableClip 
                          key={clip.id} 
                          clip={clip} 
                          track={track} 
                          onMoveClip={(id, newStart) => {
                            NativeBridge.moveClip(id, newStart).then(() => {
                              NativeBridge.fetchProject().then(p => setTracks(p.tracks));
                            });
                          }} 
                        />
                      );
                    })}
                  </View>
                </View>
              ))}
            </Animated.View>
          </GestureDetector>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  timelineHeader: { padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  timelineHeaderTitle: { color: "#ffffff", fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  timelineHeaderSub: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 },
  timelineLoading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  timelineLoadingText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  timelineEmpty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  timelineEmptyText: { color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  timelineEmptySub: { color: "rgba(255,255,255,0.3)", fontSize: 14, textAlign: "center" },
  timelineContainer: { minWidth: 800, paddingBottom: 32, position: "relative", paddingTop: 16 },
  playhead: { position: "absolute", top: 0, bottom: 0, left: 150, width: 2, backgroundColor: "#ff0044", zIndex: 10 },
  trackRow: {
    flexDirection: "row", alignItems: "center", height: 60,
    backgroundColor: "rgba(24,24,27,0.5)", borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1, marginBottom: 8, borderRadius: 8, overflow: "hidden",
  },
  trackHeader: {
    width: 64, height: "100%", justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(24,24,27,0.9)", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.08)", zIndex: 5,
  },
  trackHeaderText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "bold" },
  trackContent: { flex: 1, height: "100%", position: "relative" },
  clip: {
    position: "absolute", height: "80%", top: "10%", borderRadius: 6,
    justifyContent: "center", paddingHorizontal: 8, borderWidth: 1,
  },
  clipVideo: { backgroundColor: "rgba(0,195,255,0.2)", borderColor: "#00c3ff" },
  clipAudio: { backgroundColor: "rgba(0,255,170,0.2)", borderColor: "#00ffaa" },
  clipText: { color: "#ffffff", fontSize: 10, fontWeight: "600" },
});
