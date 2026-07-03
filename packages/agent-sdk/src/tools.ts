/**
 * Chronos Agent Tool Registry
 *
 * Exposes the canonical list of 80+ MCP tools available to the Chronos
 * agent loop.  Tools are organised into six categories matching the
 * NLE domain: **editing**, **audio**, **color**, **export**, **AI**,
 * and **project**.
 *
 * @module agent-sdk/tools
 */

// ── Tool Categories ─────────────────────────────────────────────────────────

/** Six-domain category for every MCP tool. */
export const ToolCategory = {
	Editting: "editing",
	Audio: "audio",
	Color: "color",
	Export: "export",
	Ai: "ai",
	Project: "project",
} as const;

export type ToolCategory = (typeof ToolCategory)[keyof typeof ToolCategory];

// ── Tool Definition ─────────────────────────────────────────────────────────

/** Descriptor for a single MCP tool the agent may invoke. */
export interface ToolDefinition {
	/** Unique tool name (e.g. `"add_clip"`, `"apply_eq"`). */
	name: string;
	/** Human-readable description shown to the LLM. */
	description: string;
	/** The domain category this tool belongs to. */
	category: ToolCategory;
	/** JSON Schema for the tool's parameters. */
	parameters: Record<string, unknown>;
}

// ── Tool Registry ───────────────────────────────────────────────────────────

/**
 * Immutable list of all MCP tools available to the Chronos agent loop.
 *
 * The list is organised by category.  Use {@link getToolsByCategory} to
 * filter by domain, or call {@link getAvailableTools} to receive the
 * full set.
 */
const TOOL_REGISTRY: ToolDefinition[] = [
	// ── Editing (22 tools) ────────────────────────────────────────────────
	{
		name: "add_clip",
		description:
			"Add a media clip (video, audio, image, or text) to a timeline track.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				track_id: { type: "string" },
				clip_type: { type: "string", enum: ["video", "audio", "image", "text"] },
				name: { type: "string" },
				source: { type: "string" },
				start: { type: "number" },
				end: { type: "number" },
			},
			required: ["track_id", "clip_type", "source", "start", "end"],
		},
	},
	{
		name: "remove_clip",
		description: "Remove a clip from the timeline by ID.",
		category: "editing",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "move_clip",
		description: "Move a clip to a new position (track and/or time).",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				track_id: { type: "string" },
				new_start: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "trim_clip",
		description: "Trim a clip's in/out points.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				trim_start: { type: "number" },
				trim_end: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "split_clip",
		description:
			"Split a clip at the given timecode, creating two clips.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				split_at: { type: "number" },
			},
			required: ["clip_id", "split_at"],
		},
	},
	{
		name: "ripple_delete",
		description: "Delete a clip and ripple the timeline to close the gap.",
		category: "editing",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "add_track",
		description: "Add a new track (lane) to the timeline.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string" },
				kind: {
					type: "string",
					enum: ["video", "audio", "text", "effect"],
				},
			},
			required: ["kind"],
		},
	},
	{
		name: "remove_track",
		description: "Remove a track and all its clips from the timeline.",
		category: "editing",
		parameters: {
			type: "object",
			properties: { track_id: { type: "string" } },
			required: ["track_id"],
		},
	},
	{
		name: "reorder_track",
		description:
			"Change the vertical stacking order of a track.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				track_id: { type: "string" },
				new_index: { type: "number" },
			},
			required: ["track_id", "new_index"],
		},
	},
	{
		name: "set_clip_speed",
		description:
			"Adjust playback speed of a clip (0.25x – 4x).",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				speed: { type: "number", minimum: 0.25, maximum: 4 },
			},
			required: ["clip_id", "speed"],
		},
	},
	{
		name: "reverse_clip",
		description: "Reverse playback direction of a clip.",
		category: "editing",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "freeze_frame",
		description: "Insert a freeze-frame at the given timecode.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				at_time: { type: "number" },
				duration: { type: "number" },
			},
			required: ["clip_id", "at_time", "duration"],
		},
	},
	{
		name: "add_transition",
		description: "Add a transition between two adjacent clips.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				from_clip_id: { type: "string" },
				to_clip_id: { type: "string" },
				type: {
					type: "string",
					enum: [
						"dissolve",
						"wipe",
						"slide",
						"fade",
						"zoom",
						"push",
						"dip_to_color",
					],
				},
				duration: { type: "number" },
			},
			required: ["from_clip_id", "to_clip_id", "type", "duration"],
		},
	},
	{
		name: "remove_transition",
		description: "Remove a transition between two clips.",
		category: "editing",
		parameters: {
			type: "object",
			properties: { transition_id: { type: "string" } },
			required: ["transition_id"],
		},
	},
	{
		name: "add_keyframe",
		description:
			"Add a keyframe to a clip property (position, scale, rotation, opacity).",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				property: { type: "string" },
				value: { type: "number" },
				at_time: { type: "number" },
				easing: {
					type: "string",
					enum: ["linear", "ease_in", "ease_out", "ease_in_out"],
				},
			},
			required: ["clip_id", "property", "value", "at_time"],
		},
	},
	{
		name: "remove_keyframe",
		description: "Remove a keyframe from a clip.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				property: { type: "string" },
				at_time: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "add_marker",
		description: "Add a labelled marker at a timecode.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				label: { type: "string" },
				at_time: { type: "number" },
				color: { type: "string" },
			},
			required: ["label", "at_time"],
		},
	},
	{
		name: "remove_marker",
		description: "Remove a marker from the timeline.",
		category: "editing",
		parameters: {
			type: "object",
			properties: { marker_id: { type: "string" } },
			required: ["marker_id"],
		},
	},
	{
		name: "add_text_overlay",
		description:
			"Add a text overlay (lower-third, title, or caption) at the given time range.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				text: { type: "string" },
				style: {
					type: "string",
					enum: ["lower_third", "title", "caption", "subtitle"],
				},
				start: { type: "number" },
				end: { type: "number" },
				font: { type: "string" },
				size: { type: "number" },
				color: { type: "string" },
			},
			required: ["text", "style", "start", "end"],
		},
	},
	{
		name: "edit_text_overlay",
		description: "Edit the text or style of an existing text overlay.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				overlay_id: { type: "string" },
				text: { type: "string" },
				style: { type: "string" },
				color: { type: "string" },
			},
			required: ["overlay_id"],
		},
	},
	{
		name: "remove_silence",
		description:
			"Detect and remove silent segments from an audio/video clip.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				threshold_db: { type: "number" },
				min_silence_ms: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "detect_scenes",
		description:
			"Run scene-detection on a video clip and return cut points.",
		category: "editing",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				sensitivity: { type: "number" },
			},
			required: ["clip_id"],
		},
	},

	// ── Audio (18 tools) ──────────────────────────────────────────────────
	{
		name: "apply_eq",
		description: "Apply a parametric equalizer preset to an audio clip.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				preset: {
					type: "string",
					enum: [
						"voice_enhance",
						"bass_boost",
						"treble_reduce",
						"podcast",
						"vocal_presence",
						"custom",
					],
				},
				bands: { type: "array", items: { type: "object" } },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_compressor",
		description: "Apply dynamic range compression to an audio clip.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				threshold_db: { type: "number" },
				ratio: { type: "number" },
				attack_ms: { type: "number" },
				release_ms: { type: "number" },
				makeup_gain_db: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_limiter",
		description: "Apply a brick-wall limiter to prevent clipping.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				ceiling_db: { type: "number" },
				release_ms: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_noise_gate",
		description: "Apply a noise gate to remove background hum.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				threshold_db: { type: "number" },
				attack_ms: { type: "number" },
				hold_ms: { type: "number" },
				release_ms: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_de_esser",
		description:
			"Apply de-essing to reduce sibilance (harsh 's' sounds).",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				frequency_hz: { type: "number" },
				threshold_db: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_reverb",
		description: "Add reverb to an audio clip.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				room_size: { type: "number" },
				damping: { type: "number" },
				wet_dry_mix: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_delay",
		description: "Add a delay (echo) effect.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				delay_ms: { type: "number" },
				feedback: { type: "number" },
				wet_dry_mix: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_pitch_shift",
		description: "Shift the pitch of an audio clip up or down.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				semitones: { type: "number" },
				preserve_formants: { type: "boolean" },
			},
			required: ["clip_id", "semitones"],
		},
	},
	{
		name: "normalize_audio",
		description:
			"Normalize audio loudness to a target LUFS level.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				target_lufs: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "detect_loudness",
		description:
			"Measure integrated, short-term, and momentary LUFS of a clip.",
		category: "audio",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "auto_duck",
		description:
			"Automatically duck background music under dialogue.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				music_clip_id: { type: "string" },
				dialogue_clip_id: { type: "string" },
				duck_amount_db: { type: "number" },
				attack_ms: { type: "number" },
				release_ms: { type: "number" },
			},
			required: ["music_clip_id", "dialogue_clip_id"],
		},
	},
	{
		name: "extract_audio",
		description: "Extract the audio track from a video clip as a new clip.",
		category: "audio",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "replace_audio",
		description:
			"Replace a video clip's audio with a different audio source.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				video_clip_id: { type: "string" },
				audio_clip_id: { type: "string" },
			},
			required: ["video_clip_id", "audio_clip_id"],
		},
	},
	{
		name: "add_audio_fade",
		description: "Apply a fade-in and/or fade-out to an audio clip.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				fade_in_ms: { type: "number" },
				fade_out_ms: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "crossfade",
		description: "Create a crossfade between two audio clips.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				from_clip_id: { type: "string" },
				to_clip_id: { type: "string" },
				duration_ms: { type: "number" },
			},
			required: ["from_clip_id", "to_clip_id", "duration_ms"],
		},
	},
	{
		name: "load_vst",
		description:
			"Load a VST3 plugin and apply it to an audio clip or track.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				plugin_path: { type: "string" },
				target_clip_id: { type: "string" },
				preset_path: { type: "string" },
			},
			required: ["plugin_path"],
		},
	},
	{
		name: "generate_tts",
		description:
			"Generate text-to-speech audio and place it on the timeline.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				text: { type: "string" },
				voice_id: { type: "string" },
				speed: { type: "number" },
			},
			required: ["text"],
		},
	},
	{
		name: "transcribe_audio",
		description:
			"Transcribe speech from an audio/video clip to text.",
		category: "audio",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				language: { type: "string" },
			},
			required: ["clip_id"],
		},
	},

	// ── Color (16 tools) ──────────────────────────────────────────────────
	{
		name: "apply_lut",
		description:
			"Apply a LUT (Look-Up Table) to a video clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				lut_path: { type: "string" },
				intensity: { type: "number", minimum: 0, maximum: 1 },
			},
			required: ["clip_id", "lut_path"],
		},
	},
	{
		name: "adjust_exposure",
		description: "Adjust exposure (brightness) of a video clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				stops: { type: "number" },
			},
			required: ["clip_id", "stops"],
		},
	},
	{
		name: "adjust_contrast",
		description: "Adjust contrast of a video clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				amount: { type: "number" },
			},
			required: ["clip_id", "amount"],
		},
	},
	{
		name: "adjust_saturation",
		description: "Adjust colour saturation of a video clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				amount: { type: "number" },
			},
			required: ["clip_id", "amount"],
		},
	},
	{
		name: "adjust_white_balance",
		description:
			"Adjust white balance (temperature and tint) of a video clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				temperature_k: { type: "number" },
				tint: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "adjust_highlights",
		description: "Adjust highlight recovery / roll-off.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				amount: { type: "number" },
			},
			required: ["clip_id", "amount"],
		},
	},
	{
		name: "adjust_shadows",
		description: "Lift or crush shadow detail.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				amount: { type: "number" },
			},
			required: ["clip_id", "amount"],
		},
	},
	{
		name: "color_wheels",
		description:
			"Adjust lift, gamma, and gain via three-way colour wheels.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				lift: {
					type: "object",
					properties: { r: {}, g: {}, b: {} },
				},
				gamma: {
					type: "object",
					properties: { r: {}, g: {}, b: {} },
				},
				gain: {
					type: "object",
					properties: { r: {}, g: {}, b: {} },
				},
			},
			required: ["clip_id"],
		},
	},
	{
		name: "curves",
		description:
			"Apply a custom RGB / luma curve to a clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				curve_points: { type: "array", items: { type: "object" } },
				channel: { type: "string", enum: ["rgb", "r", "g", "b", "luma"] },
			},
			required: ["clip_id", "curve_points"],
		},
	},
	{
		name: "apply_color_space_transform",
		description:
			"Convert between colour spaces (Rec.709, Rec.2020, DCI-P3, ACES).",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				from_space: { type: "string" },
				to_space: { type: "string" },
			},
			required: ["clip_id", "from_space", "to_space"],
		},
	},
	{
		name: "auto_color",
		description:
			"Auto-balance exposure, contrast, and white balance using scene analysis.",
		category: "color",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "match_color",
		description:
			"Match the colour grade of one clip to another (reference).",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				source_clip_id: { type: "string" },
				reference_clip_id: { type: "string" },
			},
			required: ["source_clip_id", "reference_clip_id"],
		},
	},
	{
		name: "add_vignette",
		description:
			"Add a vignette effect (darkened edges) to a clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				amount: { type: "number" },
				feather: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_film_grain",
		description:
			"Add film-grain texture to a clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				amount: { type: "number" },
				size: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "apply_blend_mode",
		description:
			"Set the blend mode for a clip (17 blend modes available).",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				mode: {
					type: "string",
					enum: [
						"normal",
						"multiply",
						"screen",
						"overlay",
						"darken",
						"lighten",
						"color_dodge",
						"color_burn",
						"hard_light",
						"soft_light",
						"difference",
						"exclusion",
						"hue",
						"saturation",
						"color",
						"luminosity",
						"add",
					],
				},
				opacity: { type: "number", minimum: 0, maximum: 1 },
			},
			required: ["clip_id", "mode"],
		},
	},
	{
		name: "adjust_opacity",
		description:
			"Adjust the opacity of a clip.",
		category: "color",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				opacity: { type: "number", minimum: 0, maximum: 1 },
			},
			required: ["clip_id", "opacity"],
		},
	},

	// ── Export (12 tools) ─────────────────────────────────────────────────
	{
		name: "export_video",
		description:
			"Export the timeline to a video file (MP4, MOV, ProRes, DCP, etc.).",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				format: {
					type: "string",
					enum: ["mp4", "mov", "prores", "dcp", "webm", "gif"],
				},
				codec: { type: "string" },
				resolution: { type: "string" },
				framerate: { type: "number" },
				bitrate_mbps: { type: "number" },
				output_path: { type: "string" },
				in_point: { type: "number" },
				out_point: { type: "number" },
			},
			required: ["format"],
		},
	},
	{
		name: "export_audio",
		description:
			"Export the audio mixdown (WAV, MP3, AAC, FLAC).",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				format: {
					type: "string",
					enum: ["wav", "mp3", "aac", "flac", "ogg"],
				},
				sample_rate_hz: { type: "number" },
				bit_depth: { type: "number" },
				output_path: { type: "string" },
			},
			required: ["format"],
		},
	},
	{
		name: "export_frame",
		description:
			"Export a single still frame as an image (PNG, JPEG, TIFF, EXR).",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				at_time: { type: "number" },
				format: {
					type: "string",
					enum: ["png", "jpeg", "tiff", "exr", "webp"],
				},
				output_path: { type: "string" },
			},
			required: ["at_time", "format"],
		},
	},
	{
		name: "export_image_sequence",
		description:
			"Export a range of frames as an image sequence.",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				start_frame: { type: "number" },
				end_frame: { type: "number" },
				format: { type: "string", enum: ["png", "exr", "tiff"] },
				output_dir: { type: "string" },
			},
			required: ["start_frame", "end_frame", "format", "output_dir"],
		},
	},
	{
		name: "render_preview",
		description:
			"Render a low-res preview of the current timeline.",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				resolution: { type: "string" },
				quality: { type: "string", enum: ["draft", "medium", "high"] },
			},
			required: [],
		},
	},
	{
		name: "queue_render",
		description:
			"Queue a render job on the remote render farm.",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				format: { type: "string" },
				priority: { type: "string", enum: ["low", "normal", "high"] },
			},
			required: ["format"],
		},
	},
	{
		name: "check_render_status",
		description: "Check the status of a render job by ID.",
		category: "export",
		parameters: {
			type: "object",
			properties: { job_id: { type: "string" } },
			required: ["job_id"],
		},
	},
	{
		name: "cancel_render",
		description: "Cancel a queued or in-progress render job.",
		category: "export",
		parameters: {
			type: "object",
			properties: { job_id: { type: "string" } },
			required: ["job_id"],
		},
	},
	{
		name: "generate_social_cut",
		description:
			"Generate a social-media-optimised cut (9:16, 1:1, 4:5).",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				aspect_ratio: {
					type: "string",
					enum: ["9:16", "1:1", "4:5", "16:9"],
				},
				duration_secs: { type: "number" },
				auto_reframe: { type: "boolean" },
			},
			required: ["aspect_ratio"],
		},
	},
	{
		name: "publish_to_platform",
		description:
			"Publish the exported video to YouTube, TikTok, Instagram, or Vimeo.",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				platform: {
					type: "string",
					enum: ["youtube", "tiktok", "instagram", "vimeo"],
				},
				title: { type: "string" },
				description: { type: "string" },
				tags: { type: "array", items: { type: "string" } },
			},
			required: ["platform"],
		},
	},
	{
		name: "generate_c2pa_manifest",
		description:
			"Generate a C2PA content-authenticity manifest for the export.",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				export_id: { type: "string" },
				creator_name: { type: "string" },
			},
			required: ["export_id"],
		},
	},
	{
		name: "watermark",
		description: "Add a visible and/or invisible watermark to the export.",
		category: "export",
		parameters: {
			type: "object",
			properties: {
				type: { type: "string", enum: ["visible", "invisible", "both"] },
				text: { type: "string" },
				image_path: { type: "string" },
				position: {
					type: "string",
					enum: [
						"top_left",
						"top_right",
						"bottom_left",
						"bottom_right",
						"center",
					],
				},
				opacity: { type: "number" },
			},
			required: ["type"],
		},
	},

	// ── AI (12 tools) ───────────────────────────────────────────────────────
	{
		name: "autonomous_edit",
		description:
			"Process a natural-language editing intent through the LLM pipeline.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				prompt: { type: "string" },
				require_plan_approval: { type: "boolean" },
			},
			required: ["prompt"],
		},
	},
	{
		name: "generate_video",
		description:
			"Generate AI video from a text prompt via the generative-studio service.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				prompt: { type: "string" },
				width: { type: "number" },
				height: { type: "number" },
				num_frames: { type: "number" },
				fps: { type: "number" },
			},
			required: ["prompt"],
		},
	},
	{
		name: "generate_audio",
		description:
			"Generate AI audio (music, sound effects) from a text prompt.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				prompt: { type: "string" },
				duration_secs: { type: "number" },
				genre: { type: "string" },
			},
			required: ["prompt"],
		},
	},
	{
		name: "auto_caption",
		description:
			"Automatically generate captions from speech-to-text and overlay them.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				language: { type: "string" },
				style: { type: "string" },
				translate_to: { type: "string" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "auto_chapter",
		description:
			"Automatically detect chapter markers using scene and topic analysis.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				num_chapters: { type: "number" },
				generate_thumbnails: { type: "boolean" },
			},
			required: [],
		},
	},
	{
		name: "auto_tag",
		description:
			"Generate content tags, keywords, and hashtags from the timeline content.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				count: { type: "number" },
				language: { type: "string" },
			},
			required: [],
		},
	},
	{
		name: "summarize_clip",
		description:
			"Generate a natural-language summary of a clip's content.",
		category: "ai",
		parameters: {
			type: "object",
			properties: { clip_id: { type: "string" } },
			required: ["clip_id"],
		},
	},
	{
		name: "smart_reframe",
		description:
			"AI-powered auto-reframing that tracks subjects when changing aspect ratios.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				target_aspect: { type: "string" },
				tracking_subject: { type: "string" },
			},
			required: ["clip_id", "target_aspect"],
		},
	},
	{
		name: "remove_filler_words",
		description:
			"Detect and remove filler words (um, uh, like) from audio.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				aggressiveness: {
					type: "string",
					enum: ["gentle", "normal", "aggressive"],
				},
			},
			required: ["clip_id"],
		},
	},
	{
		name: "background_removal",
		description:
			"AI-powered background removal from a video clip.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				feather: { type: "number" },
			},
			required: ["clip_id"],
		},
	},
	{
		name: "upscale",
		description:
			"AI upscaling (2x, 4x) of a low-resolution clip.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				scale: { type: "number", enum: [2, 4] },
				model: { type: "string", enum: ["standard", "anime", "cinema"] },
			},
			required: ["clip_id", "scale"],
		},
	},
	{
		name: "content_aware_fill",
		description:
			"Fill a region or gap in the timeline using AI inpainting.",
		category: "ai",
		parameters: {
			type: "object",
			properties: {
				clip_id: { type: "string" },
				region: {
					type: "object",
					properties: {
						x: {},
						y: {},
						width: {},
						height: {},
					},
				},
			},
			required: ["clip_id"],
		},
	},

	// ── Project (10 tools) ────────────────────────────────────────────────────
	{
		name: "create_project",
		description: "Create a new Lazynext project.",
		category: "project",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string" },
				width: { type: "number" },
				height: { type: "number" },
				framerate: { type: "number" },
			},
			required: ["name"],
		},
	},
	{
		name: "open_project",
		description: "Open an existing project by ID.",
		category: "project",
		parameters: {
			type: "object",
			properties: { project_id: { type: "string" } },
			required: ["project_id"],
		},
	},
	{
		name: "save_project",
		description:
			"Save the current project state (auto-saved via CRDT, explicit save creates a named snapshot).",
		category: "project",
		parameters: {
			type: "object",
			properties: { snapshot_name: { type: "string" } },
			required: [],
		},
	},
	{
		name: "list_projects",
		description: "List all projects for the authenticated user.",
		category: "project",
		parameters: {
			type: "object",
			properties: {
				archived: { type: "boolean" },
				sort_by: {
					type: "string",
					enum: ["name", "created_at", "updated_at"],
				},
			},
			required: [],
		},
	},
	{
		name: "archive_project",
		description: "Archive a project (soft-delete).",
		category: "project",
		parameters: {
			type: "object",
			properties: { project_id: { type: "string" } },
			required: ["project_id"],
		},
	},
	{
		name: "duplicate_project",
		description: "Create a copy of an existing project.",
		category: "project",
		parameters: {
			type: "object",
			properties: {
				project_id: { type: "string" },
				new_name: { type: "string" },
			},
			required: ["project_id"],
		},
	},
	{
		name: "get_timeline",
		description: "Retrieve the full CRDT timeline state.",
		category: "project",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
	{
		name: "undo",
		description: "Undo the most recent timeline mutation.",
		category: "project",
		parameters: {
			type: "object",
			properties: { steps: { type: "number" } },
			required: [],
		},
	},
	{
		name: "redo",
		description: "Redo a previously undone mutation.",
		category: "project",
		parameters: {
			type: "object",
			properties: { steps: { type: "number" } },
			required: [],
		},
	},
	{
		name: "import_media",
		description:
			"Import media from a URL or local path into the project.",
		category: "project",
		parameters: {
			type: "object",
			properties: {
				url: { type: "string" },
				source: { type: "string" },
				track_id: { type: "string" },
			},
			required: ["url"],
		},
	},
];

// ── Public Helpers ────────────────────────────────────────────────────────────

/**
 * Return the full list of 90 MCP tools available to the Chronos agent.
 *
 * ```ts
 * import { getAvailableTools } from "@lazynext/agent-sdk";
 *
 * const tools = getAvailableTools();
 * console.log(`${tools.length} tools available`);
 * ```
 */
export function getAvailableTools(): ToolDefinition[] {
	return TOOL_REGISTRY.slice();
}

/**
 * Return tools filtered by a specific domain category.
 *
 * ```ts
 * import { getToolsByCategory, ToolCategory } from "@lazynext/agent-sdk";
 *
 * const audioTools = getToolsByCategory(ToolCategory.Audio);
 * ```
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
	return TOOL_REGISTRY.filter((t) => t.category === category);
}
