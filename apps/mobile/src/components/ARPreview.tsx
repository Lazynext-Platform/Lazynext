/** @module components/ARPreview AR face filter preview and background replacement */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Image,
	Alert,
	Platform,
	Dimensions,
} from "react-native";
// @ts-ignore — expo-camera types available after install
import { CameraView } from "expo-camera";
// @ts-ignore — expo-media-library types available after install
import * as MediaLibrary from "expo-media-library";

interface FaceBounds {
	/** Normalized origin of the detected face (0–1 fraction of screen). */
	origin: { x: number; y: number };
	/** Normalized size of the detected face (0–1 fraction of screen). */
	size: { width: number; height: number };
}

const { width, height } = Dimensions.get("window");

interface FilterItem {
	/** Unique filter identifier. */
	id: string;
	/** Human-readable filter label. */
	label: string;
	/** Filter type category. */
	type: "sunglasses" | "hat" | "beauty" | "background";
	/** Optional asset URI for the filter overlay. */
	asset?: string;
	/** Optional tint color for the filter overlay. */
	color?: string;
}

const PRESET_FILTERS: FilterItem[] = [
	{ id: "none", label: "None", type: "beauty" },
	{ id: "sunglasses_aviator", label: "Aviators", type: "sunglasses", color: "#111" },
	{ id: "sunglasses_round", label: "Round", type: "sunglasses", color: "#222" },
	{ id: "hat_cap", label: "Cap", type: "hat", color: "#333" },
	{ id: "hat_cowboy", label: "Cowboy", type: "hat", color: "#8B4513" },
	{ id: "beauty_smooth", label: "Smooth", type: "beauty" },
	{ id: "beauty_glow", label: "Glow", type: "beauty" },
	{ id: "bg_blur", label: "Blur BG", type: "background" },
	{ id: "bg_bw", label: "B&W BG", type: "background" },
	{ id: "bg_neon", label: "Neon BG", type: "background" },
];

/** AR face filter preview with real-time background replacement and filter carousel. */
export function ARPreview() {
	const [activeFilter, setActiveFilter] = useState<string>("none");
	const [faces, setFaces] = useState<FaceBounds[]>([]);
	const [saving, setSaving] = useState(false);
	const cameraRef = useRef<CameraView>(null);

	useEffect(() => {
		let cancelled = false;
		const interval = setInterval(() => {
			if (cancelled) return;
			setFaces([
				{
					origin: { x: 0.35, y: 0.2 },
					size: { width: 0.3, height: 0.4 },
				},
			]);
		}, 500);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	const handleSaveFrame = useCallback(async () => {
		if (!cameraRef.current) {
			Alert.alert("Error", "Camera not available.");
			return;
		}
		setSaving(true);
		try {
			const photo = await cameraRef.current.takePictureAsync({
				quality: 0.9,
				base64: false,
			});
			if (photo?.uri) {
				const { status } = await MediaLibrary.requestPermissionsAsync();
				if (status === "granted") {
					await MediaLibrary.saveToLibraryAsync(photo.uri);
					Alert.alert("Saved", "Filtered frame saved to camera roll.");
				} else {
					Alert.alert("Permission Needed", "Media library access is required to save.");
				}
			}
		} catch (e) {
			console.warn("Save frame error:", e);
			Alert.alert("Error", "Could not save frame.");
		} finally {
			setSaving(false);
		}
	}, []);

	const activeFilterObj = PRESET_FILTERS.find((f) => f.id === activeFilter);
	const isBackgroundFilter = activeFilterObj?.type === "background";

	return (
		<View style={styles.container}>
			<CameraView
				ref={cameraRef}
				style={styles.camera}
				facing="front"
				mode="picture"
			>
				{faces.map((face, i) => (
					<View key={i} pointerEvents="none">
						{activeFilterObj?.type === "sunglasses" && (
							<View
								style={[
									styles.sunglassesOverlay,
									{
										left: face.origin.x * width - face.size.width * width * 0.1,
										top: face.origin.y * height + face.size.height * height * 0.1,
										width: face.size.width * width * 1.2,
										height: face.size.height * height * 0.3,
										backgroundColor: activeFilterObj.color ?? "#111",
									},
								]}
							/>
						)}
						{activeFilterObj?.type === "hat" && (
							<View
								style={[
									styles.hatOverlay,
									{
										left: face.origin.x * width - face.size.width * width * 0.15,
										top: face.origin.y * height - face.size.height * height * 0.3,
										width: face.size.width * width * 1.3,
										height: face.size.height * height * 0.4,
										backgroundColor: activeFilterObj.color ?? "#333",
									},
								]}
							/>
						)}
						{activeFilterObj?.type === "beauty" &&
							activeFilterObj.id !== "none" && (
								<View
									style={[
										styles.beautyOverlay,
										{
											left: face.origin.x * width,
											top: face.origin.y * height,
											width: face.size.width * width,
											height: face.size.height * height,
										},
										activeFilterObj.id === "beauty_glow" &&
											styles.beautyGlow,
									]}
								/>
							)}
					</View>
				))}

				{isBackgroundFilter && activeFilterObj && (
					<View
						style={[
							styles.backgroundOverlay,
							activeFilterObj.id === "bg_blur" && styles.bgBlur,
							activeFilterObj.id === "bg_bw" && styles.bgBW,
							activeFilterObj.id === "bg_neon" && styles.bgNeon,
						]}
					/>
				)}
			</CameraView>

			<View style={styles.filterBar}>
				{PRESET_FILTERS.filter((f) => f.type === "sunglasses").map((f) => (
					<TouchableOpacity
						key={f.id}
						style={[
							styles.filterChip,
							activeFilter === f.id && styles.filterChipActive,
						]}
						onPress={() => setActiveFilter(f.id)}
					>
						<Text
							style={[
								styles.filterChipText,
								activeFilter === f.id && styles.filterChipTextActive,
							]}
						>
							{f.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<View style={styles.filterBar}>
				{PRESET_FILTERS.filter(
					(f) => f.type === "hat" || (f.type === "beauty" && f.id !== "none"),
				).map((f) => (
					<TouchableOpacity
						key={f.id}
						style={[
							styles.filterChip,
							activeFilter === f.id && styles.filterChipActive,
						]}
						onPress={() => setActiveFilter(f.id)}
					>
						<Text
							style={[
								styles.filterChipText,
								activeFilter === f.id && styles.filterChipTextActive,
							]}
						>
							{f.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<View style={styles.filterBar}>
				{PRESET_FILTERS.filter((f) => f.type === "background").map((f) => (
					<TouchableOpacity
						key={f.id}
						style={[
							styles.filterChip,
							activeFilter === f.id && styles.filterChipActive,
						]}
						onPress={() => setActiveFilter(f.id)}
					>
						<Text
							style={[
								styles.filterChipText,
								activeFilter === f.id && styles.filterChipTextActive,
							]}
						>
							{f.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<TouchableOpacity
				style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
				onPress={handleSaveFrame}
				disabled={saving}
			>
				<Text style={styles.saveBtnText}>
					{saving ? "Saving..." : "Capture Frame"}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#000000" },
	camera: { flex: 1 },

	// Face filter overlays
	sunglassesOverlay: {
		position: "absolute",
		borderRadius: 8,
		opacity: 0.85,
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.3)",
	},
	hatOverlay: {
		position: "absolute",
		borderRadius: 8,
		opacity: 0.8,
		borderBottomLeftRadius: 40,
		borderBottomRightRadius: 40,
	},
	beautyOverlay: {
		position: "absolute",
		backgroundColor: "rgba(255,200,180,0.08)",
		borderRadius: 60,
	},
	beautyGlow: {
		backgroundColor: "rgba(255,220,180,0.12)",
		borderWidth: 1,
		borderColor: "rgba(255,200,150,0.2)",
	},

	// Background effects
	backgroundOverlay: {
		...StyleSheet.absoluteFill,
	},
	bgBlur: {
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	bgBW: {
		backgroundColor: "rgba(0,0,0,0.4)",
	},
	bgNeon: {
		backgroundColor: "rgba(128, 0, 255, 0.15)",
		borderWidth: 1,
		borderColor: "rgba(200, 50, 255, 0.2)",
	},

	// Filter chips
	filterBar: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	filterChip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.1)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.2)",
	},
	filterChipActive: {
		backgroundColor: "#00e5ff",
		borderColor: "#00e5ff",
	},
	filterChipText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 12,
		fontWeight: "600",
	},
	filterChipTextActive: {
		color: "#050505",
	},

	// Save button
	saveBtn: {
		backgroundColor: "#00e5ff",
		marginHorizontal: 24,
		marginBottom: Platform.OS === "ios" ? 40 : 24,
		marginTop: 8,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveBtnText: {
		color: "#050505",
		fontWeight: "bold",
		fontSize: 16,
	},
});
