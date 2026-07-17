/**
 * WASM player — renders individual frames from the WASM compositor
 * onto a canvas with playback controls.
 *
 * @module components/editor/wasm-player
 */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";
import {
	initCompositor,
	resizeCompositor,
	renderProjectFrame,
	uploadTexture,
	initializeGpu,
} from "lazynext-wasm";
import { ensureWasmInitialized } from "@/wasm/init";

interface WasmPlayerProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	project: any;
	/** Current frame number to render. */
	frame: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	assets?: any[];
	/** Optional external canvas ref for rendering. */
	canvasRef?: React.RefObject<HTMLCanvasElement | null>;
	/** Whether to show title-safe margins. */
	showSafeMargins?: boolean;
	/** Render quality preset (full, half, or quarter resolution). */
	renderQuality?: "full" | "half" | "quarter";
}

/** React component rendering WasmPlayer. */
export default function WasmPlayer({
	project,
	frame,
	assets = [],
	canvasRef: externalCanvasRef,
	renderQuality = "full",
}: WasmPlayerProps) {
	const getScaleFactor = () => {
		if (renderQuality === "half") return 0.5;
		if (renderQuality === "quarter") return 0.25;
		return 1.0;
	};
	const localCanvasRef = useRef<HTMLCanvasElement>(null);
	const canvasRef = externalCanvasRef || localCanvasRef;
	const [isWasmReady, setIsWasmReady] = useState(false);

	const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
	const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
	useEffect(() => {
		// Initialize WebAssembly engine
		async function loadWasm() {
			try {
				await ensureWasmInitialized();
				console.log("WASM Initialized");

				// Initialize compositor matching project dimensions
				// WebGL canvas resolution needs to be handled via initCompositor
				const scale = getScaleFactor();
				initCompositor(
					(project.width || 1920) * scale,
					(project.height || 1080) * scale,
				);
				console.log("Compositor Initialized");

				try {
					await initializeGpu();
					console.log("WebGPU Initialized Successfully!");
				} catch (gpuErr) {
					console.warn("Failed to init WebGPU, fallback might be needed:", gpuErr);
				}

				setIsWasmReady(true);
			} catch (err) {
				console.error("Failed to load Wasm", err);
			}
		}

		loadWasm();
	}, [project.width, project.height, renderQuality]);

	useEffect(() => {
		if (isWasmReady) {
			try {
				const scale = getScaleFactor();
				resizeCompositor(
					(project.width || 1920) * scale,
					(project.height || 1080) * scale,
				);
				offscreenCanvasRef.current = new OffscreenCanvas(
					(project.width || 1920) * scale,
					(project.height || 1080) * scale,
				);
			} catch (err) {
				console.error("WASM Resize Error:", err);
				if (String(err).includes("GPU context")) {
					window.location.reload();
				}
			}
		}
	}, [project.width, project.height, isWasmReady, renderQuality]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!offscreenCanvasRef.current) {
			const scale = getScaleFactor();
			offscreenCanvasRef.current = new OffscreenCanvas(
				(project.width || 1920) * scale,
				(project.height || 1080) * scale,
			);
		}

		// Sync video elements for all video assets
		const currentVideos = videoElementsRef.current;
		assets.forEach((asset) => {
			if (asset.type === "video" && !currentVideos.has(asset.id)) {
				const vid = document.createElement("video");
				vid.src = asset.url;
				vid.muted = true;
				vid.crossOrigin = "anonymous";
				vid.preload = "auto";
				currentVideos.set(asset.id, vid);
			}
		});
	}, [assets]);

	useEffect(() => {
		if (!isWasmReady) return;

		// 1. Extract textures for all visible video clips and stream to WASM
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		const ctx = offscreenCanvasRef.current?.getContext(
			"2d",
		) as OffscreenCanvasRenderingContext2D;

		if (offscreenCanvasRef.current && ctx) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			project.tracks?.forEach((track: any) => {
				if (track.isHidden) return; // Skip rendering clips on hidden tracks

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				track.clips?.forEach((clip: any) => {
					// Is the clip visible on the timeline right now?
					if (
						frame >= clip.start_frame &&
						frame < clip.start_frame + clip.duration_frames
					) {
						if (clip.type === "text") {
							// Text Rendering Logic
							const scale = getScaleFactor();
							const width = (project.width || 1920) * scale;
							const height = (project.height || 1080) * scale;
							offscreenCanvasRef.current!.width = width;
							offscreenCanvasRef.current!.height = height;

							ctx.clearRect(0, 0, width, height);

							const fontSize = (clip.font_size || 100) * scale;
							const fontFamily = clip.font_family || "Inter";
							ctx.font = `bold ${fontSize}px ${fontFamily}, sans-serif`;
							ctx.fillStyle = clip.color || "#ffffff";
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";

							// Dynamic shadow
							if (clip.shadow_color) {
								ctx.shadowColor = clip.shadow_color;
								ctx.shadowBlur = (clip.shadow_blur ?? 10) * scale;
								ctx.shadowOffsetX = (clip.shadow_offset ?? 4) * scale;
								ctx.shadowOffsetY = (clip.shadow_offset ?? 4) * scale;
							} else {
								ctx.shadowColor = "transparent";
								ctx.shadowBlur = 0;
								ctx.shadowOffsetX = 0;
								ctx.shadowOffsetY = 0;
							}

							// Apply 3D Rotation Transformations
							const rx = ((clip.rotate_x || 0) * Math.PI) / 180;
							const ry = ((clip.rotate_y || 0) * Math.PI) / 180;
							const rz = ((clip.rotate_z || 0) * Math.PI) / 180;

							ctx.save();
							ctx.translate(width / 2, height / 2);
							ctx.rotate(rz);
							// Fake 3D perspective via scaling
							ctx.scale(Math.cos(ry) || 0.01, Math.cos(rx) || 0.01);
							ctx.translate(-width / 2, -height / 2);

							if (clip.stroke_width && clip.stroke_color) {
								ctx.strokeStyle = clip.stroke_color;
								ctx.lineWidth = clip.stroke_width * scale;
								// Stroke first so fill goes over it
								ctx.strokeText(
									clip.text_content || "New Text",
									width / 2,
									height / 2,
								);
							}

							// 3D Extrusion
							const extrusionDepth = clip.extrusion_depth || 0;
							if (extrusionDepth > 0) {
								ctx.fillStyle = clip.extrusion_color || "#333333";
								for (let i = extrusionDepth; i > 0; i--) {
									ctx.fillText(
										clip.text_content || "New Text",
										width / 2 + i,
										height / 2 + i,
									);
								}
							}

							ctx.fillStyle = clip.color || "#ffffff";
							ctx.fillText(
								clip.text_content || "New Text",
								width / 2,
								height / 2,
							);

							ctx.restore(); // Restore context after 3D transformations

							try {
								uploadTexture({
									id: clip.id,
									source: offscreenCanvasRef.current,
									width: width,
									height: height,
								});
							} catch (err) {
								console.warn("WASM Text Texture Upload Error:", err);
							}
						} else {
							// Find the asset (using name as fallback for older clips)
							const asset = assets.find(
								(a) => a.id === clip.asset_id || a.name === clip.name,
							);

							if (asset && asset.type === "video") {
								const vid = videoElementsRef.current.get(asset.id);
								if (vid && vid.readyState >= 2) {
									const fps = project.fps || 60;
									// Calculate mediaFrame by integrating playback_rate
									let mediaFrame = clip.media_offset_frames || 0;
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									const hasSpeedKeyframes =
										clip.keyframes &&
										clip.keyframes.some(
											(k: any) => k.property === "playback_rate",
										);

									if (hasSpeedKeyframes) {
										for (let f = 0; f < frame - clip.start_frame; f++) {
											let val = clip.playback_rate || 1.0;
											// simplified interpolation for speed curve
											// eslint-disable-next-line @typescript-eslint/no-explicit-any
											const kfs = clip.keyframes
												.filter((k: any) => k.property === "playback_rate")
												.sort((a: any, b: any) => a.frame - b.frame);
											if (f <= kfs[0].frame) val = kfs[0].value;
											else if (f >= kfs[kfs.length - 1].frame)
												val = kfs[kfs.length - 1].value;
											else {
												for (let i = 0; i < kfs.length - 1; i++) {
													if (f >= kfs[i].frame && f <= kfs[i + 1].frame) {
														let t =
															(f - kfs[i].frame) /
															(kfs[i + 1].frame - kfs[i].frame);
														if (kfs[i].easing === "ease-in") t = t * t;
														else if (kfs[i].easing === "ease-out")
															t = t * (2.0 - t);
														else if (kfs[i].easing === "ease-in-out")
															t = t * t * (3.0 - 2.0 * t);
														else if (kfs[i].easing === "step") t = 0.0;
														val =
															kfs[i].value +
															(kfs[i + 1].value - kfs[i].value) * t;
														break;
													}
												}
											}
											mediaFrame += val;
										}
									} else {
										mediaFrame +=
											(frame - clip.start_frame) * (clip.playback_rate || 1.0);
									}

									const targetTime = mediaFrame / fps;

									// If difference is more than a frame, seek it
									if (Math.abs(vid.currentTime - targetTime) > 0.05) {
										vid.currentTime = targetTime;
									}

									// Draw to offscreen canvas
									const scale = getScaleFactor();
									const width = (vid.videoWidth || 1920) * scale;
									const height = (vid.videoHeight || 1080) * scale;
									offscreenCanvasRef.current!.width = width;
									offscreenCanvasRef.current!.height = height;

									// Optical Flow Motion Blur Parity
									if (clip.transform?.motionBlur) {
										const shutter = clip.transform?.shutterAngle || 180;
										const blurAmount = (shutter / 180) * 4; // Simulated directional magnitude
										ctx.filter = `blur(${blurAmount}px)`;
									} else {
										ctx.filter = "none";
									}

									ctx.drawImage(vid, 0, 0, width, height);
									ctx.filter = "none";

									try {
										uploadTexture({
											id: clip.id,
											source: offscreenCanvasRef.current,
											width: width,
											height: height,
										});
									} catch (err) {
										console.warn("WASM Texture Upload Error:", err);
									}
								}
							}
						}
					}
				});
			});
		}

		// 2. Instruct WASM to composite the final frame using the new textures!
		// JIT KEYFRAME INTERPOLATION
		const interpolatedProject = JSON.parse(JSON.stringify(project));

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		interpolatedProject.tracks?.forEach((track: any) => {
			if (track.isHidden) return;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			track.clips?.forEach((clip: any) => {
				if (!clip.keyframes || clip.keyframes.length === 0) return;

				const relativeFrame = frame - clip.start_frame;
				const propsToInterpolate = [
					"transform.x",
					"transform.y",
					"transform.scale",
					"transform.rotation",
					"transform.opacity",
				];

				propsToInterpolate.forEach((prop) => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const kfs = clip.keyframes
						.filter((k: any) => k.property === prop)
						.sort((a: any, b: any) => a.frame - b.frame);
					if (kfs.length === 0) return;

					let interpolatedValue = null;

					if (relativeFrame <= kfs[0].frame) {
						interpolatedValue = kfs[0].value;
					} else if (relativeFrame >= kfs[kfs.length - 1].frame) {
						interpolatedValue = kfs[kfs.length - 1].value;
					} else {
						for (let i = 0; i < kfs.length - 1; i++) {
							const k1 = kfs[i];
							const k2 = kfs[i + 1];
							if (relativeFrame >= k1.frame && relativeFrame <= k2.frame) {
								let progress =
									(relativeFrame - k1.frame) / (k2.frame - k1.frame);

								if (k1.easing === "step") {
									progress = 0; // jump at the end (or start depending on step direction, let's say step means hold value until next)
								} else if (k1.easing === "ease-in-out") {
									progress = progress * progress * (3 - 2 * progress);
								} else if (k1.easing === "ease-in") {
									progress = progress * progress;
								} else if (k1.easing === "ease-out") {
									progress = progress * (2 - progress);
								}

								interpolatedValue = k1.value + (k2.value - k1.value) * progress;
								break;
							}
						}
					}

					if (interpolatedValue !== null) {
						if (!clip.transform)
							clip.transform = {
								x: 0,
								y: 0,
								scale: 1,
								rotation: 0,
								opacity: 1,
							};
						const propName = prop.split(".")[1];
						clip.transform[propName] = interpolatedValue;
					}
				});
			});
		});

		const scale = getScaleFactor();
		interpolatedProject.width = (interpolatedProject.width || 1920) * scale;
		interpolatedProject.height = (interpolatedProject.height || 1080) * scale;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		interpolatedProject.tracks?.forEach((t: any) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			t.clips?.forEach((c: any) => {
				if (c.transform) {
					c.transform.x *= scale;
					c.transform.y *= scale;
				}
				if (c.layer?.type === "text") {
					// Actually text is rendered to offscreen canvas using unscaled width/height,
					// wait, text is drawn to offscreen canvas!
				}
			});
		});

		const projectJson = JSON.stringify(interpolatedProject);
		try {
			renderProjectFrame(projectJson, frame);
		} catch (err) {
			console.error("WASM Render Error:", err);
		}
	}, [isWasmReady, project, frame, assets]);

	return (
		<div className="flex h-full w-full items-center justify-center bg-background relative">
			<canvas
				id="lazynext-canvas"
				ref={canvasRef}
				className="max-h-full max-w-full object-contain"
				style={{
					aspectRatio: `${project.width || 1920} / ${project.height || 1080}`,
				}}
			/>
			{!isWasmReady && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/50 text-muted">
					Loading GPU Engine...
				</div>
			)}
		</div>
	);
}
