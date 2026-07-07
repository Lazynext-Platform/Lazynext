/** @module screens/CameraScreen Full camera recording with grid overlay */
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Alert,
	Dimensions,
	Platform,
	Vibration,
} from "react-native";
// @ts-ignore — expo-camera types available after install
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
// @ts-ignore — expo-media-library types available after install
import * as MediaLibrary from "expo-media-library";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { NativeBridge } from "../NativeBridge";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RECORDING_MAX_MS = 300000;

/** Camera capture screen with grid overlay, recording controls, and media library integration. */
export function CameraScreen() {
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
	const [micPermission, requestMicPermission] = useMicrophonePermissions();
	const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

	const [facing, setFacing] = useState<"front" | "back">("back");
	const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
	const [recording, setRecording] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const cameraRef = useRef<CameraView>(null);

	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const recordingStartRef = useRef<number>(0);

	/** Request camera, microphone, and media library permissions on mount. */
	useEffect(() => {
		if (!cameraPermission?.granted) {
			requestCameraPermission();
		}
		if (!micPermission?.granted) {
			requestMicPermission();
		}
		if (!mediaPermission?.granted) {
			requestMediaPermission();
		}
	}, []);

	/** Start/stop elapsed timer when recording state changes. */
	useEffect(() => {
		if (recording) {
			timerRef.current = setInterval(() => {
				setElapsed(Date.now() - recordingStartRef.current);
			}, 50);
		} else {
			if (timerRef.current) clearInterval(timerRef.current);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [recording]);

	/** Begin video recording with a max duration of 300s. Vibrates on start. */
	const handleStartRecording = useCallback(async () => {
		if (!cameraRef.current || recording) return;
		try {
			setRecording(true);
			recordingStartRef.current = Date.now();
			setElapsed(0);
			Vibration.vibrate(10);
			const result = await cameraRef.current.recordAsync({
				maxDuration: RECORDING_MAX_MS / 1000,
			});
			if (result?.uri) {
				showPostRecordingActions(result.uri);
			}
		} catch (e) {
			console.warn("Recording failed:", e);
		} finally {
			setRecording(false);
		}
	}, [recording]);

	/** Stop the active recording session. */
	const handleStopRecording = useCallback(async () => {
		if (cameraRef.current) {
			await cameraRef.current.stopRecording();
		}
	}, []);

  /** Present a post-recording action sheet: edit with AI or save to camera roll. */
	const showPostRecordingActions = (uri: string) => {
		Alert.alert("Recording Complete", "What would you like to do?", [
			{
				text: "Edit with AI",
				onPress: () => {
					NativeBridge.sendChatMessage(
						`I've recorded a new clip at ${uri}. Help me edit it.`,
					);
				},
			},
			{
				text: "Save to Camera Roll",
				onPress: async () => {
					try {
						await MediaLibrary.saveToLibraryAsync(uri);
						Alert.alert("Saved", "Saved to camera roll.");
					} catch (e) {
						Alert.alert("Error", "Could not save to camera roll.");
					}
				},
			},
			{ text: "Cancel", style: "cancel" },
		]);
	};

  /** Toggle between front and back camera. */
	const toggleFacing = () => setFacing((f) => (f === "back" ? "front" : "back"));

  /** Cycle flash mode: off → on → auto → off. */
	const toggleFlash = () => {
		setFlash((f) => {
			if (f === "off") return "on";
			if (f === "on") return "auto";
			return "off";
		});
	};

  /** Format a millisecond duration as MM:SS. */
	const formatTime = (ms: number): string => {
		const totalSec = Math.floor(ms / 1000);
		const min = Math.floor(totalSec / 60);
		const sec = totalSec % 60;
		return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
	};

	const recordGesture = Gesture.LongPress()
		.minDuration(200)
		.onStart(() => {
			handleStartRecording();
		})
		.onEnd(() => {
			if (recording) handleStopRecording();
		});

	const permissionsGranted = cameraPermission?.granted && micPermission?.granted;

	if (!permissionsGranted) {
		return (
			<View style={styles.permissionContainer}>
				<Text style={styles.permissionText}>Camera & Microphone permissions needed</Text>
				<TouchableOpacity
					style={styles.permissionButton}
					onPress={() => {
						if (!cameraPermission?.granted) requestCameraPermission();
						if (!micPermission?.granted) requestMicPermission();
					}}
				>
					<Text style={styles.permissionButtonText}>Grant Permissions</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<CameraView
				ref={cameraRef}
				style={styles.camera}
				facing={facing}
				flash={flash}
				mode="video"
				videoStabilizationMode="auto"
			>
				<View style={styles.gridOverlay}>
					<View style={styles.gridRow}>
						<View style={styles.gridCell} />
						<View style={[styles.gridCell, styles.gridCellBorder]} />
						<View style={styles.gridCell} />
					</View>
					<View style={styles.gridRow}>
						<View style={[styles.gridCell, styles.gridCellBorderH]} />
						<View style={[styles.gridCell, styles.gridCellBorder]} />
						<View style={[styles.gridCell, styles.gridCellBorderH]} />
					</View>
					<View style={styles.gridRow}>
						<View style={styles.gridCell} />
						<View style={[styles.gridCell, styles.gridCellBorder]} />
						<View style={styles.gridCell} />
					</View>
				</View>
			</CameraView>

			{/* Top bar: flash + timer */}
			<View style={styles.topBar}>
				<View style={styles.topBarLeft}>
					<TouchableOpacity style={styles.iconBtn} onPress={toggleFlash}>
						<Text style={styles.iconText}>
							{flash === "off" ? "⚡" : flash === "on" ? "🔦" : "🔅"}
						</Text>
					</TouchableOpacity>
				</View>
				{recording && (
					<View style={styles.recordingIndicator}>
						<View style={styles.recordingDot} />
						<Text style={styles.timerText}>{formatTime(elapsed)}</Text>
					</View>
				)}
				<View style={styles.topBarRight}>
					<TouchableOpacity style={styles.iconBtn} onPress={toggleFacing}>
						<Text style={styles.iconText}>📷</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Bottom: record button */}
			<View style={styles.bottomBar}>
				<GestureDetector gesture={recordGesture}>
					<TouchableOpacity
						activeOpacity={0.7}
						onPressIn={recording ? undefined : undefined}
						style={[
							styles.recordBtn,
							recording && styles.recordBtnActive,
						]}
						onLongPress={handleStartRecording}
						onPressOut={recording ? handleStopRecording : undefined}
					>
						<View
							style={[
								styles.recordBtnInner,
								recording && styles.recordBtnInnerRecording,
							]}
						/>
					</TouchableOpacity>
				</GestureDetector>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#000000" },
	camera: { flex: 1 },
	permissionContainer: {
		flex: 1,
		backgroundColor: "#050505",
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
	},
	permissionText: {
		color: "#ffffff",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 24,
	},
	permissionButton: {
		backgroundColor: "#00e5ff",
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 12,
	},
	permissionButtonText: {
		color: "#050505",
		fontWeight: "bold",
		fontSize: 16,
	},

	// Grid (rule of thirds)
	gridOverlay: {
		...StyleSheet.absoluteFill,
		flexDirection: "column",
	},
	gridRow: {
		flex: 1,
		flexDirection: "row",
	},
	gridCell: {
		flex: 1,
	},
	gridCellBorder: {
		borderColor: "rgba(255,255,255,0.25)",
		borderWidth: 0.5,
	},
	gridCellBorderH: {
		borderColor: "rgba(255,255,255,0.25)",
		borderTopWidth: 0.5,
		borderBottomWidth: 0.5,
	},

	// Top bar
	topBar: {
		position: "absolute",
		top: Platform.OS === "ios" ? 60 : 24,
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	topBarLeft: { flexDirection: "row", gap: 12 },
	topBarRight: { flexDirection: "row", gap: 12 },
	iconBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	iconText: { fontSize: 20 },
	recordingIndicator: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,0,68,0.3)",
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		gap: 8,
	},
	recordingDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#ff0044",
	},
	timerText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "700",
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},

	// Bottom bar
	bottomBar: {
		position: "absolute",
		bottom: Platform.OS === "ios" ? 48 : 32,
		left: 0,
		right: 0,
		alignItems: "center",
	},
	recordBtn: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 4,
		borderColor: "#ffffff",
		justifyContent: "center",
		alignItems: "center",
	},
	recordBtnActive: {
		borderColor: "#ff0044",
		transform: [{ scale: 1.2 }],
	},
	recordBtnInner: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "#ff0044",
	},
	recordBtnInnerRecording: {
		width: 28,
		height: 28,
		borderRadius: 6,
	},
});
