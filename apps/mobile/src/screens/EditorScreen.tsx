/** @module screens/EditorScreen Editor screen component for mobile */
import React, { useState, useEffect, useRef } from "react";
import { useTheme, Theme } from "../theme";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Dimensions,
	TouchableOpacity,
	Alert,
} from "react-native";
import { NativeBridge } from "../NativeBridge";
import { useApplePencil } from "../hooks/use-apple-pencil";
import { OfflineStorage } from "../services/offline-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Clip {
	/** Unique clip identifier. */
	id: string;
	/** Clip display name. */
	name: string;
	/** Start time in frames. */
	start: number;
	/** End time in frames. */
	end: number;
}

interface MaskPoint {
	/** X coordinate. */
	x: number;
	/** Y coordinate. */
	y: number;
	/** Apple Pencil pressure (0-1). */
	pressure: number;
}

/** Full editor screen with timeline, mask drawing, and voice control. */
export const EditorScreen = () => {
  const { theme, mode, setMode } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
	const [clips, setClips] = useState<Clip[]>([]);
	const [currentFrame, setCurrentFrame] = useState(0);
	const [projectName, setProjectName] = useState("");
	const [isOffline, setIsOffline] = useState(false);
	const [pendingSyncCount, setPendingSyncCount] = useState(0);
	const [maskPoints, setMaskPoints] = useState<MaskPoint[]>([]);
	const [isMaskDrawing, setIsMaskDrawing] = useState(false);
	const pencil = useApplePencil();
	const editorAreaRef = useRef<View>(null);

	/** Subscribe to project, offline status, and connectivity changes on mount. */
	useEffect(() => {
		NativeBridge.fetchProject().then((project) => {
			setProjectName(project.name);
			const allClips: Clip[] = [];
			for (const track of project.tracks) {
				for (const c of track.clips) {
					allClips.push({
						id: c.id,
						name: c.name,
						start: c.start,
						end: c.start + (c.duration ?? 100),
					});
				}
			}
			setClips(allClips);
		});

		OfflineStorage.getOfflineStatus().then((status) => {
			setIsOffline(!status.isOnline);
			setPendingSyncCount(status.queuedOpsCount);
		});

		const unsubConnectivity = NativeBridge.onConnectivityChange(
			async (connected) => {
				setIsOffline(!connected);
				if (connected) {
					const result = await OfflineStorage.syncPendingChanges();
					setPendingSyncCount(0);
					if (result.synced > 0) {
						console.log(`Synced ${result.synced} pending operations`);
					}
				}
			},
		);

		return () => {
			unsubConnectivity();
		};
	}, []);

  /** Shows an alert with a prompt to integrate expo-image-picker for media import. */
	const handleImportMedia = () => {
		console.log("Import Media pressed — expo-image-picker not yet integrated.");
		Alert.alert(
			"Import Media",
			"Media import will be available when expo-image-picker is integrated.\n\nYou can also use the Lazynext AI Agent tab to generate B-roll or add clips via natural language.",
		);
	};

	// ── Mask Drawing with Pencil Pressure ──

	const handleMaskStart = () => {
		setIsMaskDrawing(true);
		setMaskPoints([]);
	};

	const handleMaskMove = (x: number, y: number) => {
		if (!isMaskDrawing) return;
		setMaskPoints((prev) => [
			...prev,
			{ x, y, pressure: pencil.isActive ? pencil.pressure : 0.5 },
		]);
	};

	const handleMaskEnd = () => {
		setIsMaskDrawing(false);
		if (maskPoints.length > 0) {
			console.log(
				`Mask drawn with ${maskPoints.length} points, avg pressure: ${
					maskPoints.reduce((a, p) => a + p.pressure, 0) / maskPoints.length
				}`,
			);
		}
	};

	const handleMaskAreaTouch = (e: any) => {
		const { locationX, locationY } = e.nativeEvent;
		handleMaskMove(locationX, locationY);
	};

	const pressureIndicatorWidth = pencil.isActive
		? Math.round(pencil.pressure * 100)
		: 0;

	const clipCount = clips.length;

	return (
		<View style={styles.container}>
			{/* Offline Indicator Banner */}
			{isOffline && (
				<View style={styles.offlineBanner}>
					<View style={styles.offlineDot} />
					<Text style={styles.offlineText}>
						Offline Mode
						{pendingSyncCount > 0 &&
							` — ${pendingSyncCount} change${
								pendingSyncCount !== 1 ? "s" : ""
							} pending sync`}
					</Text>
				</View>
			)}

			{/* Video Preview Area */}
			<View style={styles.previewContainer}>
				<View style={styles.previewBox}>
					<Text style={styles.previewProjectName}>
						{projectName || "No Project Open"}
					</Text>
					<Text style={styles.previewMeta}>
						{clipCount} clip{clipCount !== 1 ? "s" : ""} on timeline
					</Text>
				</View>
			</View>

			{/* Pencil Mask Drawing Area */}
			<View
				ref={editorAreaRef}
				style={styles.maskArea}
				onTouchStart={(e) => {
					handleMaskStart();
					handleMaskAreaTouch(e);
				}}
				onTouchMove={handleMaskAreaTouch}
				onTouchEnd={handleMaskEnd}
			>
				<View style={styles.maskAreaHeader}>
					<Text style={styles.maskAreaLabel}>
						Mask Drawing{" "}
						{pencil.supported && (
							<Text style={styles.pencilHint}>
								(pencil: {pressureIndicatorWidth}%)
							</Text>
						)}
					</Text>
					{pencil.isActive && (
						<View style={styles.pencilActiveBadge}>
							<Text style={styles.pencilActiveText}>Pencil Active</Text>
						</View>
					)}
				</View>

				{pencil.isActive && (
					<View style={styles.pressureBar}>
						<View
							style={[
								styles.pressureFill,
								{ width: `${pressureIndicatorWidth}%` },
							]}
						/>
					</View>
				)}

				<View style={styles.maskCanvas}>
					{maskPoints.length > 0 &&
						maskPoints.map((pt, i) => (
							<View
								key={i}
								style={[
									styles.maskPoint,
									{
										left: pt.x - 4,
										top: pt.y - 4,
										width: 4 + pt.pressure * 12,
										height: 4 + pt.pressure * 12,
										borderRadius: (4 + pt.pressure * 12) / 2,
										opacity: 0.3 + pt.pressure * 0.7,
									},
								]}
							/>
						))}
					{maskPoints.length === 0 && (
						<Text style={styles.maskHint}>
							{pencil.supported
								? "Use Apple Pencil to draw a mask here"
								: "Touch and drag to draw a mask"}
						</Text>
					)}
				</View>
			</View>

			{/* Editor Controls / Timeline */}
			<View style={styles.editorContainer}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>
						{projectName || "TIMELINE"}
					</Text>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
						<TouchableOpacity 
							onPress={() => {
								const next = mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system';
								setMode(next);
							}}
							style={styles.themeToggle}
						>
							<Text style={styles.themeToggleText}>Theme: {mode}</Text>
						</TouchableOpacity>
						<Text style={styles.headerFrame}>Frame: {currentFrame}</Text>
					</View>
				</View>

				<TouchableOpacity
					style={styles.importButton}
					onPress={handleImportMedia}
				>
					<Text style={styles.importButtonText}>Import Media</Text>
				</TouchableOpacity>

				<ScrollView
					horizontal
					style={styles.timelineScroll}
					showsHorizontalScrollIndicator={false}
				>
					<View style={[styles.timelineTrack, { width: 1000 }]}>
						<View
							style={[styles.playhead, { left: currentFrame * 2 }]}
						/>

						{clips.map((clip) => (
							<TouchableOpacity
								key={clip.id}
								style={[
									styles.clip,
									{
										left: clip.start * 2,
										width: (clip.end - clip.start) * 2,
									},
								]}
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

const getStyles = (theme: Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.bgMain,
	},
	// ── Offline Banner ──
	offlineBanner: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: theme.bgHover,
		borderBottomWidth: 1,
		borderBottomColor: theme.borderGlass,
		paddingVertical: 8,
		paddingHorizontal: 16,
		gap: 8,
	},
	offlineDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: theme.accentSecondary,
	},
	offlineText: {
		color: theme.accentSecondary,
		fontSize: 12,
		fontWeight: "600",
	},
	// ── Preview ──
	previewContainer: {
		flex: 0.3,
		backgroundColor: theme.bgMain,
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
	},
	previewBox: {
		width: "100%",
		aspectRatio: 16 / 9,
		maxHeight: 200,
		backgroundColor: theme.bgMain,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.borderGlass,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	previewProjectName: {
		color: theme.textPrimary,
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
	},
	previewMeta: {
		color: theme.textSecondary,
		fontSize: 13,
		fontWeight: "500",
	},
	// ── Mask Drawing Area ──
	maskArea: {
		flex: 0.25,
		backgroundColor: theme.bgMain,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: theme.borderGlass,
		padding: 12,
	},
	maskAreaHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	maskAreaLabel: {
		color: theme.textMuted,
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1,
	},
	pencilHint: {
		color: theme.accentPrimary,
		fontSize: 11,
		fontWeight: "400",
	},
	pencilActiveBadge: {
		backgroundColor: theme.bgHover,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: theme.borderGlass,
	},
	pencilActiveText: {
		color: theme.accentPrimary,
		fontSize: 10,
		fontWeight: "700",
	},
	pressureBar: {
		height: 4,
		backgroundColor: theme.borderGlass,
		borderRadius: 2,
		marginBottom: 8,
		overflow: "hidden",
	},
	pressureFill: {
		height: "100%",
		backgroundColor: theme.accentPrimary,
		borderRadius: 2,
	},
	maskCanvas: {
		flex: 1,
		backgroundColor: theme.bgHover,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: theme.borderGlass,
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
	},
	maskHint: {
		color: theme.textMuted,
		fontSize: 13,
	},
	maskPoint: {
		position: "absolute",
		backgroundColor: theme.accentPrimary,
	},
	// ── Editor Timeline ──
	editorContainer: {
		flex: 0.2,
		backgroundColor: theme.bgMain,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 12,
		borderTopWidth: 1,
		borderColor: theme.borderGlass,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	headerTitle: {
		color: theme.textMuted,
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 1,
	},
	headerFrame: {
		color: theme.textPrimary,
		fontSize: 11,
		fontFamily: "Menlo",
	},
	themeToggle: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: theme.bgHover,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: theme.borderGlass,
	},
	themeToggleText: {
		color: theme.textPrimary,
		fontSize: 10,
		fontWeight: "600",
		textTransform: "capitalize",
	},
	timelineScroll: {
		flex: 1,
		backgroundColor: theme.bgHover,
		borderRadius: 8,
	},
	timelineTrack: {
		height: 50,
		position: "relative",
		paddingVertical: 5,
	},
	playhead: {
		position: "absolute",
		top: 0,
		bottom: 0,
		width: 2,
		backgroundColor: theme.accentSecondary,
		zIndex: 10,
		shadowColor: theme.accentSecondary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 4,
	},
	clip: {
		position: "absolute",
		height: 32,
		top: 9,
		backgroundColor: theme.bgHover,
		borderColor: theme.borderGlass,
		borderWidth: 1,
		borderRadius: 6,
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	clipText: {
		color: theme.textPrimary,
		fontSize: 10,
		fontWeight: "500",
	},
	importButton: {
		backgroundColor: theme.bgHover,
		borderWidth: 1,
		borderColor: theme.bgHover,
		borderRadius: 8,
		paddingVertical: 8,
		alignItems: "center",
		marginBottom: 8,
	},
	importButtonText: {
		color: theme.accentSecondary,
		fontSize: 12,
		fontWeight: "600",
	},
});
