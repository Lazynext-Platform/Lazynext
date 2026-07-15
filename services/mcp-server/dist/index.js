"use strict";
/**
 * Lazynext MCP Server — Model Context Protocol server over stdio.
 *
 * Exposes 81 video editing tools, 10 resources, and 8 prompt templates
 * to MCP clients (Claude Desktop, Cursor, etc.), enabling natural-language
 * video editing intents to be routed through the Lazynext API Gateway /
 * AI Agents orchestrator.
 *
 * Authentication: Set LAZYNEXT_MCP_API_KEY env var. Passed as
 * X-API-Key header to the AI Agents service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const server = new index_js_1.Server({
    name: "lazynext-mcp-server",
    version: "2.0.0",
}, {
    capabilities: {
        tools: {},
        resources: {},
        prompts: {},
    },
});
const API_KEY = process.env.LAZYNEXT_MCP_API_KEY || "";
const AI_AGENTS_URL = process.env.AI_AGENTS_URL || "http://localhost:8002";
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:8005";
const TOOLS = [
    // ═══════════════════════════════════════════════════════════════════
    // Core Editing
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "autonomous_edit",
        description: "Execute an AI-powered video editing intent on the Lazynext timeline. Accepts natural language prompts like 'cut silences', 'add crossfade', 'apply cinematic color grade'.",
        inputSchema: {
            type: "object",
            properties: {
                prompt: { type: "string", description: "The natural language editing instruction" },
                projectId: { type: "string", description: "Optional project ID to apply edits to" },
            },
            required: ["prompt"],
        },
    },
    {
        name: "transcribe",
        description: "Transcribe video/audio using Whisper with speaker diarization.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to the media file" },
                language: { type: "string", description: "Language code (e.g. 'en', 'es')" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "edit_via_transcript",
        description: "Edit video by editing its transcript text. Remove words/sentences to cut the corresponding video segments.",
        inputSchema: {
            type: "object",
            properties: {
                transcript: { type: "string", description: "The transcript text with timestamps" },
                edits: { type: "string", description: "Description of edits to apply" },
            },
            required: ["transcript"],
        },
    },
    {
        name: "remove_filler_words",
        description: "Remove filler words (um, uh, like, you know) from the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                threshold: { type: "number", description: "Confidence threshold for filler detection (0-1)" },
            },
        },
    },
    {
        name: "diarize_speakers",
        description: "Identify and label different speakers in the audio track.",
        inputSchema: {
            type: "object",
            properties: {
                numSpeakers: { type: "number", description: "Expected number of speakers" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Audio
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "enhance_audio",
        description: "Enhance audio quality with EQ, compression, and noise reduction.",
        inputSchema: {
            type: "object",
            properties: {
                profile: { type: "string", description: "Audio profile: 'studio_podcast' or 'vocal_boost'" },
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "clean_audio",
        description: "Remove background noise and normalize audio levels.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "apply_auto_ducking",
        description: "Automatically duck (lower) music volume when speech is detected.",
        inputSchema: {
            type: "object",
            properties: {
                duckLevel: { type: "number", description: "Ducking level in dB (default: -15)" },
                attackMs: { type: "number", description: "Attack time in milliseconds" },
            },
        },
    },
    {
        name: "split_stems",
        description: "Separate audio into stems (vocals, drums, bass, other).",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "add_sound_effect",
        description: "Add a sound effect at a specific timeline position.",
        inputSchema: {
            type: "object",
            properties: {
                effect: { type: "string", description: "Sound effect name or description" },
                position: { type: "number", description: "Timeline position in seconds" },
            },
            required: ["effect"],
        },
    },
    {
        name: "audio_denoise",
        description: "Remove background noise from audio using AI-based noise reduction.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                strength: { type: "number", description: "Noise reduction strength (0-1, default: 0.5)" },
                profile: { type: "string", description: "Noise profile: 'auto', 'wind', 'hiss', 'hum', 'traffic'" },
            },
        },
    },
    {
        name: "audio_deverb",
        description: "Remove reverb and echo from audio recordings.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                amount: { type: "number", description: "Dereverb amount (0-1, default: 0.5)" },
            },
        },
    },
    {
        name: "pitch_shift",
        description: "Shift audio pitch up or down without affecting speed.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                semitones: { type: "number", description: "Pitch shift in semitones (e.g. 12 = one octave up, -12 = one octave down)" },
                preserveFormants: { type: "boolean", description: "Preserve vocal formants for natural sound" },
            },
            required: ["semitones"],
        },
    },
    {
        name: "add_reverb",
        description: "Add reverb effect to audio with configurable room size and decay.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                roomSize: { type: "number", description: "Room size (0-1, default: 0.5)" },
                decay: { type: "number", description: "Reverb decay in seconds (default: 1.5)" },
                mix: { type: "number", description: "Wet/dry mix (0-1, default: 0.3)" },
                preset: { type: "string", description: "Preset: 'small_room', 'large_hall', 'cathedral', 'plate', 'spring'" },
            },
        },
    },
    {
        name: "auto_mix",
        description: "Auto-mix all audio tracks to target LUFS loudness standard.",
        inputSchema: {
            type: "object",
            properties: {
                targetLUFS: { type: "number", description: "Target LUFS level (default: -14 for streaming, -23 for broadcast)" },
                maxTruePeak: { type: "number", description: "Maximum true peak in dBTP (default: -1)" },
                profile: { type: "string", description: "Mix profile: 'podcast', 'music', 'film', 'social_media'" },
            },
        },
    },
    {
        name: "generate_soundtrack",
        description: "Generate background music matching the video's mood and pacing.",
        inputSchema: {
            type: "object",
            properties: {
                mood: { type: "string", description: "Music mood: 'cinematic', 'upbeat', 'ambient', 'dramatic', 'corporate', 'happy', 'sad', 'tense'" },
                duration: { type: "number", description: "Duration in seconds (default: match project)" },
                genre: { type: "string", description: "Music genre: 'electronic', 'orchestral', 'lofi', 'rock', 'jazz', 'pop'" },
                tempo: { type: "number", description: "Tempo in BPM (auto-detected if unspecified)" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Color & Grading
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "apply_color_grade",
        description: "Apply a cinematic color grade to the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                style: { type: "string", description: "Style: 'cinematic', 'vintage', 'teal_orange', 'black_and_white', 'warm', 'cool'" },
            },
        },
    },
    {
        name: "apply_color_match",
        description: "Match the color grade of one clip to another reference clip.",
        inputSchema: {
            type: "object",
            properties: {
                referenceClipId: { type: "string", description: "Reference clip ID for color matching" },
                targetClipId: { type: "string", description: "Target clip ID to apply match to" },
            },
            required: ["referenceClipId"],
        },
    },
    {
        name: "apply_lut",
        description: "Apply a LUT (Look-Up Table) to the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                lutName: { type: "string", description: "LUT name or path to .cube file" },
                intensity: { type: "number", description: "LUT intensity (0-1, default: 1.0)" },
            },
            required: ["lutName"],
        },
    },
    {
        name: "adjust_hdr_color",
        description: "Adjust HDR color parameters including exposure, highlights, shadows.",
        inputSchema: {
            type: "object",
            properties: {
                exposure: { type: "number", description: "Exposure adjustment in stops" },
                highlights: { type: "number", description: "Highlights adjustment" },
                shadows: { type: "number", description: "Shadows adjustment" },
                contrast: { type: "number", description: "Contrast adjustment" },
                saturation: { type: "number", description: "Saturation adjustment" },
            },
        },
    },
    {
        name: "auto_white_balance",
        description: "Auto white balance a clip by analyzing neutral tones.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                colorTemp: { type: "number", description: "Manual color temperature in Kelvin (auto if unspecified)" },
                tint: { type: "number", description: "Manual tint adjustment (auto if unspecified)" },
            },
        },
    },
    {
        name: "match_colors",
        description: "Match colors between two clips using AI color transfer.",
        inputSchema: {
            type: "object",
            properties: {
                sourceClipId: { type: "string", description: "Source clip with desired color palette" },
                targetClipId: { type: "string", description: "Target clip to apply color match to" },
                strength: { type: "number", description: "Match strength (0-1, default: 1.0)" },
            },
            required: ["sourceClipId", "targetClipId"],
        },
    },
    {
        name: "apply_film_look",
        description: "Apply a cinematic film look including grain, halation, and color response.",
        inputSchema: {
            type: "object",
            properties: {
                preset: { type: "string", description: "Film stock preset: 'kodak_2383', 'fuji_3513', 'teal_orange_blockbuster', 'wes_anderson', 'noir', 'bleach_bypass', 'cross_process'" },
                grainAmount: { type: "number", description: "Film grain amount (0-1, default: 0.3)" },
                halation: { type: "number", description: "Halation bloom (0-1, default: 0.2)" },
                intensity: { type: "number", description: "Overall effect intensity (0-1, default: 1.0)" },
            },
        },
    },
    {
        name: "sky_replacement",
        description: "AI-powered sky replacement for outdoor scenes.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                skyType: { type: "string", description: "Replacement sky: 'sunset', 'sunny', 'cloudy', 'storm', 'night', 'aurora', 'custom'" },
                feather: { type: "number", description: "Edge feathering (0-100, default: 10)" },
                blendAmount: { type: "number", description: "Blend amount (0-1, default: 0.8)" },
            },
            required: ["clipId"],
        },
    },
    {
        name: "beauty_filter",
        description: "Apply skin smoothing and beauty enhancement to faces in video.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                smoothing: { type: "number", description: "Skin smoothing intensity (0-1, default: 0.4)" },
                brighten: { type: "number", description: "Skin brightening (0-1, default: 0.2)" },
                eyeEnhance: { type: "number", description: "Eye enhancement (0-1, default: 0.3)" },
                preset: { type: "string", description: "Preset: 'natural', 'glamour', 'subtle'" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Effects & Compositing
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "style_transfer",
        description: "Apply artistic style transfer to video (anime, claymation, pencil sketch, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                style: { type: "string", description: "Style: 'anime', 'claymation', 'pencil', 'detail_enhance'" },
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl", "style"],
        },
    },
    {
        name: "generative_fill",
        description: "Remove objects from video using AI inpainting/generative fill.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                maskRegion: { type: "string", description: "Region to inpaint (JSON with x, y, width, height)" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "remove_background",
        description: "Remove video background using AI rotoscoping (SAM2).",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "track_motion",
        description: "Track object motion in video for attaching effects or text.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                roi: { type: "string", description: "Region of interest (JSON with x, y, width, height)" },
            },
            required: ["mediaUrl", "roi"],
        },
    },
    {
        name: "apply_beauty_retouch",
        description: "Apply beauty/skin retouching to faces in video.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                intensity: { type: "number", description: "Retouch intensity (0-1)" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "chroma_key",
        description: "Apply green/blue screen chroma keying with spill suppression.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                keyColor: { type: "string", description: "Key color: 'green', 'blue', or hex color code" },
                threshold: { type: "number", description: "Color threshold (0-1, default: 0.4)" },
                edgeFeather: { type: "number", description: "Edge feather amount (0-1, default: 0.05)" },
                spillSuppression: { type: "number", description: "Spill suppression (0-1, default: 0.5)" },
            },
            required: ["clipId"],
        },
    },
    {
        name: "stabilize_clip",
        description: "Apply video stabilization to smooth shaky footage.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                strength: { type: "number", description: "Stabilization strength (0-1, default: 0.5)" },
                mode: { type: "string", description: "Mode: 'smooth', 'locked', 'cinematic'" },
                cropMargin: { type: "number", description: "Crop margin percentage (default: 5)" },
            },
        },
    },
    {
        name: "remove_object",
        description: "AI-powered object removal — paint over an object and it disappears across frames.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                objectDescription: { type: "string", description: "Natural language description of what to remove (e.g. 'the coffee cup', 'all people in background')" },
                maskRegion: { type: "string", description: "Bounding box JSON: {x, y, width, height}" },
                inpaintingMethod: { type: "string", description: "Method: 'sift', 'propainter', 'lama'" },
            },
            required: ["clipId", "objectDescription"],
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Text & Captions
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "add_viral_captions",
        description: "Add animated viral-style captions (Hormozi style) to the video.",
        inputSchema: {
            type: "object",
            properties: {
                style: { type: "string", description: "Caption style: 'hormozi', 'alex', 'minimal', 'karaoke'" },
                color: { type: "string", description: "Caption highlight color (hex)" },
            },
        },
    },
    {
        name: "add_kinetic_typography",
        description: "Add animated kinetic typography text animations.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Text to animate" },
                style: { type: "string", description: "Animation style" },
                position: { type: "number", description: "Timeline position in seconds" },
                duration: { type: "number", description: "Duration in seconds" },
            },
            required: ["text"],
        },
    },
    {
        name: "add_lower_third",
        description: "Add a professional lower third name/title overlay.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Person's name to display" },
                title: { type: "string", description: "Person's title or role" },
                style: { type: "string", description: "Lower third style: 'minimal', 'corporate', 'news', 'sports', 'elegant', 'bold'" },
                position: { type: "number", description: "Start time in seconds" },
                duration: { type: "number", description: "Duration in seconds (default: 5)" },
                logo: { type: "string", description: "URL of logo/brand mark to include" },
            },
            required: ["name"],
        },
    },
    {
        name: "add_title_card",
        description: "Add an animated title card/intro sequence.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Title text" },
                subtitle: { type: "string", description: "Optional subtitle text" },
                style: { type: "string", description: "Title style: 'cinematic', 'minimal', 'bold', 'elegant', 'glitch', 'retro', 'neon'" },
                position: { type: "number", description: "Timeline position in seconds" },
                duration: { type: "number", description: "Duration in seconds (default: 5)" },
                background: { type: "string", description: "Background: 'solid', 'gradient', 'blur', 'video', 'none'" },
            },
            required: ["text"],
        },
    },
    {
        name: "add_callout",
        description: "Add an animated callout with arrow or highlight to point at something.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Callout text" },
                targetRegion: { type: "string", description: "Region to point at (JSON: {x, y, width, height})" },
                style: { type: "string", description: "Style: 'arrow', 'circle', 'underline', 'zoom_box', 'highlight'" },
                position: { type: "number", description: "Timeline position in seconds" },
                duration: { type: "number", description: "Duration in seconds" },
            },
        },
    },
    {
        name: "generate_subtitles",
        description: "Generate and optionally burn subtitles from audio transcript.",
        inputSchema: {
            type: "object",
            properties: {
                language: { type: "string", description: "Language code (auto-detect if unspecified)" },
                format: { type: "string", description: "Output format: 'srt', 'vtt', 'burned', 'embedded'" },
                style: { type: "string", description: "Subtitle style for burned subtitles: 'classic', 'modern', 'youtube'" },
                maxLines: { type: "number", description: "Maximum lines per subtitle (default: 2)" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // AI Generation
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "generate_dub",
        description: "Generate AI voice dubbing using ElevenLabs text-to-speech.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Text to convert to speech" },
                voiceId: { type: "string", description: "ElevenLabs voice ID" },
                language: { type: "string", description: "Language code" },
            },
            required: ["text"],
        },
    },
    {
        name: "overdub_audio",
        description: "Overdub audio with AI-generated speech (ElevenLabs + Coqui fallback).",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Text to overdub" },
                voiceId: { type: "string", description: "Voice ID for cloning/dubbing" },
            },
            required: ["text"],
        },
    },
    {
        name: "generate_broll",
        description: "Generate B-roll footage using AI video generation.",
        inputSchema: {
            type: "object",
            properties: {
                prompt: { type: "string", description: "Description of desired B-roll footage" },
                duration: { type: "number", description: "Duration in seconds" },
            },
            required: ["prompt"],
        },
    },
    {
        name: "generate_ai_avatar",
        description: "Generate an AI avatar video with lip-synced speech.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Text for the avatar to speak" },
                avatarStyle: { type: "string", description: "Avatar style or ID" },
            },
            required: ["text"],
        },
    },
    {
        name: "auto_fill_broll",
        description: "Automatically fill gaps in the timeline with relevant B-roll footage.",
        inputSchema: {
            type: "object",
            properties: {
                topic: { type: "string", description: "Topic or theme for B-roll search" },
                source: { type: "string", description: "Source: 'pexels', 'ai_generated', 'stock'" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Timeline & Editing
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "auto_beat_sync",
        description: "Automatically sync clip cuts to the music beat.",
        inputSchema: {
            type: "object",
            properties: {
                sensitivity: { type: "number", description: "Beat detection sensitivity (0-1)" },
            },
        },
    },
    {
        name: "toggle_pancake_timeline",
        description: "Toggle the pancake timeline view for multi-track editing.",
        inputSchema: {
            type: "object",
            properties: {
                enabled: { type: "boolean", description: "Enable or disable pancake timeline" },
            },
            required: ["enabled"],
        },
    },
    {
        name: "setup_multicam",
        description: "Set up a multicam editing workspace with angle switching.",
        inputSchema: {
            type: "object",
            properties: {
                angles: { type: "number", description: "Number of camera angles" },
                syncMethod: { type: "string", description: "Sync method: 'timecode', 'audio', 'manual'" },
            },
            required: ["angles"],
        },
    },
    {
        name: "apply_speed_ramp",
        description: "Apply speed ramping (slow-mo, fast-forward) to a clip.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Clip ID to apply speed ramp to" },
                speed: { type: "number", description: "Speed multiplier (0.25 = quarter speed, 2.0 = double speed)" },
                easing: { type: "string", description: "Easing: 'linear', 'ease_in', 'ease_out', 'ease_in_out'" },
            },
            required: ["speed"],
        },
    },
    {
        name: "perform_trim_edit",
        description: "Perform trim edits (ripple, roll, slip, slide) on the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                operation: { type: "string", description: "Trim operation: 'ripple', 'roll', 'slip', 'slide'" },
                clipId: { type: "string", description: "Target clip ID" },
                amount: { type: "number", description: "Trim amount in frames" },
            },
            required: ["operation"],
        },
    },
    {
        name: "split_clip_at_cursor",
        description: "Split a clip at the current playhead/cursor position on the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID (splits clip under cursor if unspecified)" },
                position: { type: "number", description: "Split position in seconds (uses playhead if unspecified)" },
            },
        },
    },
    {
        name: "ripple_delete",
        description: "Delete a clip and ripple remaining clips to close the gap.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Clip ID to ripple delete" },
                affectAllTracks: { type: "boolean", description: "Ripple all tracks (default: true)" },
            },
            required: ["clipId"],
        },
    },
    {
        name: "add_crossfade",
        description: "Add an audio or video crossfade transition between two adjacent clips.",
        inputSchema: {
            type: "object",
            properties: {
                clipAId: { type: "string", description: "First clip ID" },
                clipBId: { type: "string", description: "Second clip ID" },
                duration: { type: "number", description: "Crossfade duration in seconds (default: 1.0)" },
                type: { type: "string", description: "Crossfade type: 'linear', 'smooth_in', 'smooth_out', 'film_dissolve'" },
                mode: { type: "string", description: "Mode: 'audio', 'video', 'both' (default: 'both')" },
            },
            required: ["clipAId", "clipBId"],
        },
    },
    {
        name: "reverse_clip",
        description: "Reverse a clip so it plays backwards.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID to reverse" },
                reverseAudio: { type: "boolean", description: "Also reverse audio (default: true)" },
            },
            required: ["clipId"],
        },
    },
    {
        name: "freeze_frame",
        description: "Insert a freeze frame (still image) at the cursor position.",
        inputSchema: {
            type: "object",
            properties: {
                position: { type: "number", description: "Timeline position in seconds (uses playhead if unspecified)" },
                duration: { type: "number", description: "Freeze frame duration in seconds (default: 3)" },
                freezeType: { type: "string", description: "Type: 'frame_hold', 'export_still', 'time_remap'" },
            },
            required: ["duration"],
        },
    },
    {
        name: "nested_sequence",
        description: "Create a nested sequence (compound clip) from selected clips.",
        inputSchema: {
            type: "object",
            properties: {
                clipIds: { type: "string", description: "JSON array of clip IDs to nest" },
                name: { type: "string", description: "Name for the nested sequence" },
                flattenAudio: { type: "boolean", description: "Flatten audio into stereo mix (default: false)" },
            },
            required: ["clipIds"],
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Reframing & Transform
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "auto_reframe",
        description: "Automatically reframe video for different aspect ratios (9:16, 1:1, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                targetAspect: { type: "string", description: "Target aspect ratio: '9:16', '1:1', '4:5', '16:9'" },
            },
            required: ["mediaUrl", "targetAspect"],
        },
    },
    {
        name: "extrude_3d_text",
        description: "Add extruded 3D text with lighting and shadows.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Text to extrude in 3D" },
                depth: { type: "number", description: "Extrusion depth" },
                color: { type: "string", description: "Text color (hex)" },
            },
            required: ["text"],
        },
    },
    {
        name: "smart_crop",
        description: "AI-powered content-aware cropping that follows the subject.",
        inputSchema: {
            type: "object",
            properties: {
                clipId: { type: "string", description: "Target clip ID" },
                targetAspect: { type: "string", description: "Target aspect ratio: '9:16', '1:1', '16:9', '4:5'" },
                trackingTarget: { type: "string", description: "What to track: 'face', 'person', 'object', 'auto'" },
                smoothness: { type: "number", description: "Movement smoothness (0-1, default: 0.5)" },
            },
            required: ["targetAspect"],
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Effects & Particles
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "setup_3d_environment",
        description: "Set up a 3D environment/camera for the composition.",
        inputSchema: {
            type: "object",
            properties: {
                type: { type: "string", description: "Environment type: 'studio', 'outdoor', 'abstract'" },
                lighting: { type: "string", description: "Lighting preset" },
            },
        },
    },
    {
        name: "add_particle_system",
        description: "Add a particle system effect (sparks, smoke, confetti, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                type: { type: "string", description: "Particle type: 'sparks', 'smoke', 'confetti', 'snow', 'fire'" },
                position: { type: "number", description: "Timeline position in seconds" },
                duration: { type: "number", description: "Duration in seconds" },
            },
            required: ["type"],
        },
    },
    {
        name: "add_null_object",
        description: "Add a null object for parenting and complex transforms.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Null object name" },
                position: { type: "number", description: "Timeline position in seconds" },
            },
        },
    },
    {
        name: "add_shape_layer",
        description: "Add a shape layer (rectangle, circle, polygon, line).",
        inputSchema: {
            type: "object",
            properties: {
                shape: { type: "string", description: "Shape type: 'rectangle', 'circle', 'polygon', 'line', 'star'" },
                color: { type: "string", description: "Fill color (hex)" },
                position: { type: "number", description: "Timeline position in seconds" },
                duration: { type: "number", description: "Duration in seconds" },
            },
            required: ["shape"],
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Export & Delivery
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "export_project",
        description: "Export/render the project to a video file.",
        inputSchema: {
            type: "object",
            properties: {
                format: { type: "string", description: "Export format: 'mp4', 'prores', 'dcp', 'aaf', 'mov', 'gif'" },
                resolution: { type: "string", description: "Resolution: '1080p', '4k', '720p'" },
                bitrate: { type: "number", description: "Bitrate in kbps" },
                projectId: { type: "string", description: "Project ID to export" },
            },
        },
    },
    {
        name: "publish_to_social",
        description: "Publish the rendered video to social media platforms.",
        inputSchema: {
            type: "object",
            properties: {
                platform: { type: "string", description: "Platform: 'tiktok', 'youtube', 'instagram', 'all'" },
                caption: { type: "string", description: "Post caption/description" },
                mediaUrl: { type: "string", description: "URL of the rendered video" },
            },
            required: ["platform"],
        },
    },
    {
        name: "render_section",
        description: "Render only a specific section/range of the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                inPoint: { type: "number", description: "Start time in seconds" },
                outPoint: { type: "number", description: "End time in seconds" },
                format: { type: "string", description: "Export format: 'mp4', 'prores', 'mov' (default: 'mp4')" },
                resolution: { type: "string", description: "Resolution: '1080p', '4k', '720p', 'source'" },
                label: { type: "string", description: "Label for the rendered section" },
            },
            required: ["inPoint", "outPoint"],
        },
    },
    {
        name: "export_gif",
        description: "Export a portion of the timeline as an animated GIF.",
        inputSchema: {
            type: "object",
            properties: {
                inPoint: { type: "number", description: "Start time in seconds" },
                outPoint: { type: "number", description: "End time in seconds" },
                width: { type: "number", description: "Output width in pixels (default: 480)" },
                fps: { type: "number", description: "Frame rate (default: 15)" },
                quality: { type: "string", description: "Quality: 'high', 'medium', 'low' (default: 'medium')" },
                loop: { type: "boolean", description: "Loop the GIF (default: true)" },
            },
        },
    },
    {
        name: "export_proxy",
        description: "Export a low-resolution proxy file for quick sharing and review.",
        inputSchema: {
            type: "object",
            properties: {
                quality: { type: "string", description: "Proxy quality: '360p', '540p', '720p' (default: '540p')" },
                burnTimecode: { type: "boolean", description: "Burn visible timecode overlay (default: true)" },
                burnWatermark: { type: "boolean", description: "Burn watermark overlay (default: false)" },
                includeAudio: { type: "boolean", description: "Include audio track (default: true)" },
            },
        },
    },
    {
        name: "generate_thumbnail",
        description: "Generate a video thumbnail/poster frame from the timeline.",
        inputSchema: {
            type: "object",
            properties: {
                position: { type: "number", description: "Timeline position in seconds (auto-selects best frame if unspecified)" },
                width: { type: "number", description: "Output width in pixels (default: 1920)" },
                format: { type: "string", description: "Image format: 'jpg', 'png', 'webp' (default: 'jpg')" },
                overlay: { type: "string", description: "Text overlay for the thumbnail" },
                smartSelect: { type: "boolean", description: "Use AI to select the most engaging frame (default: true)" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Media Management
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "fetch_assets",
        description: "Fetch and list all assets in the project media pool.",
        inputSchema: {
            type: "object",
            properties: {
                filter: { type: "string", description: "Filter by asset type: 'video', 'audio', 'image', 'all'" },
            },
        },
    },
    {
        name: "generate_proxies",
        description: "Generate proxy/low-res versions of media for smoother editing.",
        inputSchema: {
            type: "object",
            properties: {
                quality: { type: "string", description: "Proxy quality: '360p', '540p', '720p', '1080p'" },
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "extract_viral_hook",
        description: "Extract the most engaging/viral hook segment from a video.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                duration: { type: "number", description: "Target hook duration in seconds (default: 5)" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "auto_tags",
        description: "Auto-generate metadata tags, keywords, and description for the project.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID to analyze" },
                tagCount: { type: "number", description: "Maximum number of tags to generate (default: 20)" },
                language: { type: "string", description: "Language for tags and description" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Monitoring & Utility
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "toggle_scopes",
        description: "Toggle video scopes display (waveform, vectorscope, histogram, parade).",
        inputSchema: {
            type: "object",
            properties: {
                scope: { type: "string", description: "Scope type: 'waveform', 'vectorscope', 'histogram', 'parade', 'all'" },
                enabled: { type: "boolean", description: "Enable or disable scopes" },
            },
            required: ["scope", "enabled"],
        },
    },
    {
        name: "setup_node_grading",
        description: "Set up node-based color grading workflow.",
        inputSchema: {
            type: "object",
            properties: {
                nodes: { type: "string", description: "Node configuration (JSON array of node definitions)" },
            },
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Project Management
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "get_timeline_state",
        description: "Get the current state of the project timeline (tracks, clips, keyframes).",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID" },
            },
        },
    },
    {
        name: "get_project_info",
        description: "Get project metadata (name, resolution, frame rate, duration).",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID" },
            },
        },
    },
    {
        name: "analyze_media",
        description: "Analyze a media file (codec, resolution, duration, bitrate, scenes).",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "import_media",
        description: "Import media into the project from URL or file path.",
        inputSchema: {
            type: "object",
            properties: {
                mediaUrl: { type: "string", description: "URL or path to media file" },
                projectId: { type: "string", description: "Project ID" },
            },
            required: ["mediaUrl"],
        },
    },
    {
        name: "render",
        description: "Render the current project to a video file via the render service.",
        inputSchema: {
            type: "object",
            properties: {
                format: { type: "string", description: "Export format" },
                projectId: { type: "string", description: "Project ID" },
            },
        },
    },
    {
        name: "duplicate_project",
        description: "Duplicate/ clone the current project with all assets and settings.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Source project ID to duplicate" },
                newName: { type: "string", description: "Name for the duplicated project" },
                copyRenderCache: { type: "boolean", description: "Also copy render cache (default: false)" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "archive_project",
        description: "Archive and clean up a project — collect media, trim unused assets, compress.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "Project ID to archive" },
                collectMedia: { type: "boolean", description: "Collect and copy all media into archive (default: true)" },
                trimUnused: { type: "boolean", description: "Remove unused media from archive (default: true)" },
                preserveProxies: { type: "boolean", description: "Keep proxy files in archive (default: false)" },
                outputPath: { type: "string", description: "Archive output path (default: project folder)" },
            },
            required: ["projectId"],
        },
    },
    // ═══════════════════════════════════════════════════════════════════
    // Scheduled Routines, Channels & Background Tasks
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "schedule_routine",
        description: "Schedule a recurring editing routine to run on a cron schedule (e.g. auto-export every night, auto-color grade daily).",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the routine" },
                cronExpression: { type: "string", description: "Cron expression (e.g. '0 2 * * *' for every night at 2am)" },
                prompt: { type: "string", description: "The editing prompt to execute on each run" },
                enabled: { type: "boolean", description: "Whether the routine is enabled (default: true)" },
            },
            required: ["name", "cronExpression", "prompt"],
        },
    },
    {
        name: "list_routines",
        description: "List all scheduled editing routines.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "cancel_routine",
        description: "Cancel and remove a scheduled routine.",
        inputSchema: {
            type: "object",
            properties: {
                routineId: { type: "string", description: "ID of the routine to cancel" },
            },
            required: ["routineId"],
        },
    },
    {
        name: "register_webhook_channel",
        description: "Register a messaging channel (Telegram, Discord, Slack, iMessage, Webhook) for push-based editing events.",
        inputSchema: {
            type: "object",
            properties: {
                channel: { type: "string", description: "Channel type: 'telegram', 'discord', 'slack', 'imessage', 'webhook'" },
                url: { type: "string", description: "Webhook URL for the channel" },
                secret: { type: "string", description: "Secret token for verifying incoming events" },
            },
            required: ["channel", "url", "secret"],
        },
    },
    {
        name: "enqueue_background_task",
        description: "Enqueue a background task (auto-export, backup, media cleanup, proxy generation, thumbnail regeneration).",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Task name" },
                payload: { type: "string", description: "Task payload (e.g. project ID, file paths)" },
                taskType: { type: "string", description: "Task type: 'auto_export', 'auto_backup', 'media_cleanup', 'proxy_generation', 'thumbnail_regeneration'" },
                priority: { type: "number", description: "Task priority (0 = highest, 255 = lowest, default: 100)" },
            },
            required: ["name", "payload", "taskType"],
        },
    },
    {
        name: "get_task_status",
        description: "Check the status of a background task by ID.",
        inputSchema: {
            type: "object",
            properties: {
                taskId: { type: "string", description: "Task ID to check" },
            },
            required: ["taskId"],
        },
    },
];
const RESOURCES = [
    {
        uri: "project://current/assets",
        name: "Project Assets",
        description: "Lists all media assets in the current project with type, duration, and status",
        mimeType: "application/json",
    },
    {
        uri: "project://current/effects",
        name: "Applied Effects",
        description: "Lists all effects applied to clips on the timeline with parameters",
        mimeType: "application/json",
    },
    {
        uri: "project://current/stats",
        name: "Project Statistics",
        description: "Project statistics including duration, clip count, track count, resolution, frame rate",
        mimeType: "application/json",
    },
    {
        uri: "presets://effects",
        name: "Effect Presets",
        description: "All available effect presets grouped by category (stylize, distort, blur, etc.)",
        mimeType: "application/json",
    },
    {
        uri: "presets://transitions",
        name: "Transition Presets",
        description: "All available transition presets (dissolve, wipe, slide, zoom, 3D, glitch)",
        mimeType: "application/json",
    },
    {
        uri: "presets://color-grades",
        name: "Color Grading Presets",
        description: "All available color grading presets (cinematic, vintage, teal/orange, film stocks)",
        mimeType: "application/json",
    },
    {
        uri: "templates://titles",
        name: "Title Templates",
        description: "All available animated title card templates with preview descriptions",
        mimeType: "application/json",
    },
    {
        uri: "templates://lower-thirds",
        name: "Lower Third Templates",
        description: "All available lower third overlay templates with style descriptions",
        mimeType: "application/json",
    },
    {
        uri: "docs://keyboard-shortcuts",
        name: "Keyboard Shortcuts",
        description: "Complete keyboard shortcut reference for Lazynext by category",
        mimeType: "application/json",
    },
    {
        uri: "system://capabilities",
        name: "System Capabilities",
        description: "Lists all platform capabilities: supported formats, codecs, GPU features, AI models",
        mimeType: "application/json",
    },
];
function resolveResourceContent(uri) {
    switch (uri) {
        case "project://current/assets":
        case "project://current/effects":
        case "project://current/stats":
            return JSON.stringify({
                message: "Connect a live project session to view real-time project data",
                uri,
                available: false,
                hint: "Open a project in the Lazynext web editor, then reconnect the MCP server for live resource access.",
            }, null, 2);
        case "presets://effects":
            return JSON.stringify({
                categories: {
                    stylize: [
                        { name: "film_grain", display: "Film Grain", description: "Add realistic film grain" },
                        { name: "vignette", display: "Vignette", description: "Darken edges for cinematic look" },
                        { name: "glow", display: "Glow", description: "Soft dream-like glow effect" },
                        { name: "posterize", display: "Posterize", description: "Reduce color palette for artistic effect" },
                        { name: "cartoon", display: "Cartoon", description: "Stylized cartoon/comic look" },
                    ],
                    distort: [
                        { name: "ripple", display: "Ripple", description: "Water ripple distortion" },
                        { name: "lens_distortion", display: "Lens Distortion", description: "Barrel/pincushion distortion" },
                        { name: "turbulent_displace", display: "Turbulent Displace", description: "Organic turbulent distortion" },
                        { name: "wave", display: "Wave Warp", description: "Sine wave warping" },
                    ],
                    blur: [
                        { name: "gaussian", display: "Gaussian Blur", description: "Standard gaussian blur" },
                        { name: "directional", display: "Directional Blur", description: "Motion blur in a direction" },
                        { name: "radial", display: "Radial Blur", description: "Zoom/radial blur" },
                        { name: "bokeh", display: "Bokeh", description: "Lens bokeh blur" },
                    ],
                    keying: [
                        { name: "chroma_key", display: "Chroma Key", description: "Green/blue screen removal" },
                        { name: "luma_key", display: "Luma Key", description: "Brightness-based keying" },
                        { name: "difference_key", display: "Difference Key", description: "Difference matte keying" },
                    ],
                    generate: [
                        { name: "noise", display: "Noise", description: "Procedural noise generation" },
                        { name: "gradient", display: "Gradient Ramp", description: "Color gradient generator" },
                        { name: "grid", display: "Grid", description: "Grid overlay generator" },
                    ],
                },
            }, null, 2);
        case "presets://transitions":
            return JSON.stringify({
                categories: {
                    dissolve: [
                        { name: "cross_dissolve", display: "Cross Dissolve", description: "Standard fade between clips" },
                        { name: "film_dissolve", display: "Film Dissolve", description: "Film-like dissolve with grain" },
                        { name: "dip_to_black", display: "Dip to Black", description: "Fade through black" },
                        { name: "dip_to_white", display: "Dip to White", description: "Fade through white" },
                        { name: "non_additive", display: "Non-Additive Dissolve", description: "Luminance-based dissolve" },
                    ],
                    wipe: [
                        { name: "linear_wipe", display: "Linear Wipe", description: "Straight line wipe" },
                        { name: "radial_wipe", display: "Radial Wipe", description: "Circular expanding wipe" },
                        { name: "clock_wipe", display: "Clock Wipe", description: "Clock-hand sweep transition" },
                        { name: "iris_wipe", display: "Iris Wipe", description: "Circular iris open/close" },
                        { name: "gradient_wipe", display: "Gradient Wipe", description: "Soft gradient-based wipe" },
                    ],
                    slide: [
                        { name: "push", display: "Push", description: "Clips push each other" },
                        { name: "slide", display: "Slide", description: "Clip slides in/out" },
                        { name: "band_slide", display: "Band Slide", description: "Slide with alternating bands" },
                    ],
                    zoom: [
                        { name: "zoom_in", display: "Zoom In", description: "Zoom into next clip" },
                        { name: "zoom_out", display: "Zoom Out", description: "Zoom out from current clip" },
                        { name: "cross_zoom", display: "Cross Zoom", description: "Cross-zoom between clips" },
                    ],
                    glitch: [
                        { name: "glitch_dissolve", display: "Glitch Dissolve", description: "Digital glitch transition" },
                        { name: "rgb_split", display: "RGB Split", description: "Color channel split transition" },
                        { name: "data_mosh", display: "Data Moshing", description: "Compression artifact style" },
                    ],
                    "3d": [
                        { name: "cube_spin", display: "Cube Spin", description: "3D cube rotation" },
                        { name: "page_curl", display: "Page Curl", description: "3D page curl peel" },
                        { name: "flip", display: "Flip Over", description: "3D card flip" },
                        { name: "fold", display: "Fold", description: "Paper fold transition" },
                    ],
                },
            }, null, 2);
        case "presets://color-grades":
            return JSON.stringify({
                presets: [
                    { name: "cinematic_01", display: "Blockbuster Teal/Orange", description: "Classic Hollywood action film look with teal shadows and orange highlights", style: "cinematic" },
                    { name: "vintage_01", display: "1970s Vintage", description: "Warm retro look with faded blacks and slight sepia", style: "vintage" },
                    { name: "noir_01", display: "Film Noir", description: "High contrast black and white with crushed shadows", style: "bw" },
                    { name: "kodak_2383", display: "Kodak 2383 Print", description: "Authentic Kodak 2383 film print emulation", style: "film" },
                    { name: "fuji_3513", display: "Fuji 3513 Print", description: "Fuji Eterna 3513 film print emulation", style: "film" },
                    { name: "wes_anderson", display: "Wes Anderson", description: "Pastel color palette with symmetric warmth", style: "stylized" },
                    { name: "bleach_bypass", display: "Bleach Bypass", description: "Desaturated high-contrast look", style: "stylized" },
                    { name: "cross_process", display: "Cross Process", description: "Color-shifted cross-processing effect", style: "creative" },
                    { name: "moody_blue", display: "Moody Blue Hour", description: "Cool blue tones with lifted blacks", style: "moody" },
                    { name: "golden_hour", display: "Golden Hour Glow", description: "Warm golden hour light emulation", style: "warm" },
                    { name: "horror_green", display: "Horror Grade", description: "Desaturated green-tinted horror look", style: "genre" },
                    { name: "sci_fi", display: "Sci-Fi Cyberpunk", description: "Neon-heavy cyberpunk grade", style: "genre" },
                ],
                luts: [
                    { name: "arri_logc_to_rec709", display: "ARRI LogC → Rec709", description: "Technical conversion LUT for ARRI footage" },
                    { name: "sony_slog3_to_rec709", display: "Sony S-Log3 → Rec709", description: "Technical conversion LUT for Sony footage" },
                    { name: "red_log3g10_to_rec709", display: "RED Log3G10 → Rec709", description: "Technical conversion LUT for RED footage" },
                ],
            }, null, 2);
        case "templates://titles":
            return JSON.stringify({
                templates: [
                    { name: "cinematic_epic", display: "Cinematic Epic", description: "Large sweeping title with particle dust", category: "cinematic", hasSubtitle: true },
                    { name: "minimal_clean", display: "Minimal Clean", description: "Simple elegant text reveal", category: "minimal", hasSubtitle: false },
                    { name: "glitch_type", display: "Glitch Typography", description: "Digital glitch/HUD style title", category: "tech", hasSubtitle: true },
                    { name: "retro_80s", display: "Retro 80s", description: "Synthwave-inspired neon title", category: "retro", hasSubtitle: true },
                    { name: "bold_impact", display: "Bold Impact", description: "Heavy dramatic title with scale bounce", category: "bold", hasSubtitle: false },
                    { name: "elegant_serif", display: "Elegant Serif", description: "Refined serif title with gentle fade", category: "elegant", hasSubtitle: true },
                    { name: "handwritten", display: "Handwritten", description: "Animated handwriting reveal", category: "creative", hasSubtitle: false },
                    { name: "typewriter", display: "Typewriter", description: "Classic typewriter character reveal", category: "classic", hasSubtitle: true },
                    { name: "neon_sign", display: "Neon Sign", description: "Glowing neon tube effect", category: "neon", hasSubtitle: false },
                ],
            }, null, 2);
        case "templates://lower-thirds":
            return JSON.stringify({
                templates: [
                    { name: "news_bar", display: "News Bar", description: "Classic news-style lower third with animated bar", category: "broadcast" },
                    { name: "corporate_clean", display: "Corporate Clean", description: "Minimal corporate style with logo slot", category: "corporate", hasLogo: true },
                    { name: "elegant_line", display: "Elegant Line", description: "Thin elegant line accent with name/title", category: "elegant" },
                    { name: "sports_stats", display: "Sports Stats", description: "Bold sports-style with stat bars", category: "sports", hasLogo: true },
                    { name: "gradient_box", display: "Gradient Box", description: "Modern gradient background box", category: "modern" },
                    { name: "minimal_fade", display: "Minimal Fade", description: "Simple fade-in text with underline accent", category: "minimal" },
                    { name: "social_handle", display: "Social Handle", description: "Includes social media handle/username field", category: "social" },
                    { name: "dual_name", display: "Dual Name", description: "Two-person name plate for interviews", category: "interview" },
                    { name: "location_tag", display: "Location Tag", description: "Location/venue name with map pin icon", category: "location" },
                ],
            }, null, 2);
        case "docs://keyboard-shortcuts":
            return JSON.stringify({
                categories: {
                    playback: {
                        "Space": "Play/Pause",
                        "J": "Reverse playback (press multiple times for speed)",
                        "K": "Stop playback",
                        "L": "Forward playback (press multiple times for speed)",
                        "ArrowLeft": "Go to previous frame",
                        "ArrowRight": "Go to next frame",
                        "Shift+ArrowLeft": "Go to previous keyframe/marker",
                        "Shift+ArrowRight": "Go to next keyframe/marker",
                        "Home": "Go to start of timeline",
                        "End": "Go to end of timeline",
                        "I": "Set in point",
                        "O": "Set out point",
                    },
                    editing: {
                        "Cmd/Ctrl+B": "Cut/Split clip at playhead",
                        "Cmd/Ctrl+Shift+B": "Razor all tracks at playhead",
                        "Cmd/Ctrl+Z": "Undo",
                        "Cmd/Ctrl+Shift+Z": "Redo",
                        "Delete": "Clear/Delete selected (no ripple)",
                        "Shift+Delete": "Ripple delete",
                        "Cmd/Ctrl+D": "Apply default transition",
                        "Cmd/Ctrl+R": "Speed/duration dialog",
                        "Cmd/Ctrl+G": "Group/Nest selected clips",
                        "Cmd/Ctrl+Shift+G": "Ungroup/Unnest",
                    },
                    tools: {
                        "V": "Selection tool",
                        "C": "Razor/Cut tool",
                        "A": "Track select forward",
                        "Shift+A": "Track select backward",
                        "R": "Rate stretch tool",
                        "P": "Pen tool (keyframes)",
                        "H": "Hand tool (pan timeline)",
                        "Z": "Zoom tool",
                        "T": "Type/Text tool",
                    },
                    navigation: {
                        "Cmd/Ctrl+Plus": "Zoom in timeline",
                        "Cmd/Ctrl+Minus": "Zoom out timeline",
                        "Backslash (\\)": "Zoom to fit entire sequence",
                        "Cmd/Ctrl+1": "Project panel",
                        "Cmd/Ctrl+2": "Source monitor",
                        "Cmd/Ctrl+3": "Program monitor",
                        "Cmd/Ctrl+4": "Timeline panel",
                        "Cmd/Ctrl+5": "Effects panel",
                        "Cmd/Ctrl+6": "Audio mixer",
                    },
                    marking: {
                        "M": "Add marker at playhead",
                        "Shift+M": "Go to next marker",
                        "Cmd/Ctrl+Shift+M": "Go to previous marker",
                        "Alt+M": "Clear selected marker",
                        "Cmd/Ctrl+Alt+M": "Clear all markers",
                    },
                },
            }, null, 2);
        case "system://capabilities":
            return JSON.stringify({
                platform: {
                    name: "Lazynext",
                    version: "2.0.0",
                    architecture: "Multi-platform (macOS, Windows, Linux, Web, Mobile)",
                },
                formats: {
                    import: ["mp4", "mov", "avi", "mkv", "webm", "mxf", "r3d", "arriraw", "braw", "prores", "dnxhd", "h264", "h265", "av1", "wav", "mp3", "aac", "flac", "ogg", "jpg", "png", "tiff", "exr", "dpx", "psd"],
                    export: ["mp4", "mov", "prores", "dnxhd", "h264", "h265", "av1", "gif", "image_sequence", "dcp", "aaf", "xml", "fcpxml", "edl"],
                    resolutions: ["SD (480p)", "HD (720p)", "Full HD (1080p)", "2K", "4K UHD", "4K DCI", "6K", "8K", "custom"],
                },
                colorSpaces: ["rec709", "rec2020", "rec2100_pq", "rec2100_hlg", "p3_d65", "p3_dci", "aces", "acescg", "srgb", "display_p3"],
                audio: {
                    sampleRates: [44100, 48000, 88200, 96000, 192000],
                    channels: [1, 2, 6, 8, 16],
                    formats: ["wav", "aiff", "mp3", "aac", "flac", "ogg"],
                    dsp: ["eq", "compressor", "limiter", "deesser", "reverb", "delay", "chorus", "flanger", "phaser", "distortion"],
                    vst: "VST3 host with 200+ plugin support",
                },
                gpu: {
                    api: ["Metal", "Vulkan", "WebGPU", "OpenGL", "CUDA"],
                    features: ["hardware_encode", "hardware_decode", "realtime_effects", "3d_rendering", "ray_tracing"],
                },
                ai: {
                    models: ["whisper_v3", "sam2", "sdxl", "animatediff", "propainter", "lama", "esrgan", "real_esrgan", "gfpgan", "codeformer"],
                    features: ["transcription", "diarization", "translation", "object_removal", "background_removal", "style_transfer", "super_resolution", "face_enhancement", "motion_tracking", "scene_detection"],
                },
                effects: {
                    count: 47,
                    blendModes: ["normal", "multiply", "screen", "overlay", "soft_light", "hard_light", "color_dodge", "color_burn", "darken", "lighten", "difference", "exclusion", "hue", "saturation", "color", "luminosity", "add", "subtract"],
                    categories: ["stylize", "distort", "blur", "keying", "generate", "transform", "color", "audio", "time", "transition", "text"],
                },
            }, null, 2);
        default:
            return JSON.stringify({ error: `Unknown resource: ${uri}` });
    }
}
const PROMPTS = [
    {
        name: "edit/viral-reel",
        description: "Template for creating viral short-form content (TikTok, Reels, Shorts)",
        arguments: [
            { name: "topic", description: "The topic or niche of the content", required: true },
            { name: "platform", description: "Target platform: 'tiktok', 'instagram', 'youtube_shorts'", required: false },
            { name: "duration", description: "Target duration in seconds (default: 30)", required: false },
            { name: "tone", description: "Content tone: 'educational', 'entertaining', 'inspirational', 'trending'", required: false },
        ],
    },
    {
        name: "edit/podcast",
        description: "Template for editing multi-track podcast episodes",
        arguments: [
            { name: "numSpeakers", description: "Number of speakers/guests", required: true },
            { name: "style", description: "Editing style: 'tight' (aggressive cuts), 'conversational' (natural flow), 'hybrid'", required: false },
        ],
    },
    {
        name: "edit/tutorial",
        description: "Template for tutorial and how-to video editing",
        arguments: [
            { name: "topic", description: "What the tutorial teaches", required: true },
            { name: "includeIntro", description: "Include intro/outro cards: true/false", required: false },
            { name: "style", description: "Style: 'screencast', 'talking_head', 'mixed'", required: false },
        ],
    },
    {
        name: "edit/product-review",
        description: "Template for product review and unboxing videos",
        arguments: [
            { name: "productName", description: "Name of the product being reviewed", required: true },
            { name: "style", description: "Style: 'unboxing', 'in_depth', 'comparison', 'quick_look'", required: false },
        ],
    },
    {
        name: "edit/wedding",
        description: "Template for wedding video highlight editing",
        arguments: [
            { name: "duration", description: "Target duration: 'teaser' (1-3 min), 'highlight' (5-10 min), 'feature' (15-30 min)", required: true },
            { name: "style", description: "Style: 'cinematic', 'documentary', 'vintage', 'modern'", required: false },
        ],
    },
    {
        name: "edit/talking-head",
        description: "Template for talking-head / vlog style content",
        arguments: [
            { name: "style", description: "Style: 'vlog', 'educational', 'storytime', 'reaction'", required: false },
            { name: "includeCaptions", description: "Add animated captions: true/false (default: true)", required: false },
        ],
    },
    {
        name: "edit/montage",
        description: "Template for highlight montages (sports, events, travel)",
        arguments: [
            { name: "theme", description: "Montage theme: 'sports', 'travel', 'event', 'year_in_review', 'music_video'", required: true },
            { name: "musicStyle", description: "Background music style preference", required: false },
            { name: "pace", description: "Edit pace: 'fast' (quick cuts), 'medium', 'slow' (longer shots)", required: false },
        ],
    },
    {
        name: "edit/interview",
        description: "Template for interview and conversation videos",
        arguments: [
            { name: "numPeople", description: "Number of people in the interview", required: true },
            { name: "style", description: "Style: 'single_camera', 'two_camera', 'multicam', 'podcast_style'", required: false },
            { name: "includeGraphics", description: "Include name lower thirds and title cards: true/false", required: false },
        ],
    },
];
function resolvePromptContent(name, args) {
    switch (name) {
        case "edit/viral-reel": {
            const topic = args?.topic || "[INSERT TOPIC]";
            const platform = args?.platform || "tiktok";
            const duration = args?.duration || "30";
            const tone = args?.tone || "entertaining";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Create a ${duration}-second ${tone} ${platform} video about "${topic}".

Use the following workflow:
1. auto_reframe to 9:16 vertical format
2. extract_viral_hook for the first 3 seconds to grab attention
3. add_viral_captions with hormozi style captions in a bright contrasting color
4. auto_beat_sync the cuts to the background music
5. remove_filler_words for clean pacing
6. apply_color_grade with a vibrant social-media style
7. add an engaging lower_third with the creator name
8. auto_mix audio to -14 LUFS for social media loudness
9. smart_crop to ensure the subject stays centered
10. export at 1080x1920 for vertical video

If there's music, duck it during speech using apply_auto_ducking. End with a strong call to action.`
                    },
                }];
        }
        case "edit/podcast": {
            const numSpeakers = args?.numSpeakers || "2";
            const style = args?.style || "hybrid";
            const styleInstructions = style === "tight"
                ? "Aggressively cut pauses, filler words, and tangents. Keep pace fast and engaging. Remove all silence longer than 0.5 seconds."
                : style === "conversational"
                    ? "Keep a natural conversational flow. Remove only obvious mistakes and long pauses. Preserve laughter and natural reactions."
                    : "Balance clean pacing with natural flow. Remove filler words, tighten pauses to 0.3s, but preserve natural conversation rhythm.";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit this ${numSpeakers}-speaker podcast episode:

1. diarize_speakers to identify and label all ${numSpeakers} speakers
2. transcribe the full episode
3. remove_filler_words (um, uh, like, you know)
4. ${styleInstructions}
5. enhance_audio with the 'studio_podcast' profile for each speaker
6. audio_denoise to remove background hum and room tone
7. For multi-camera: setup_multicam with ${numSpeakers} angles, auto-switching to the active speaker
8. add an intro title_card with the episode name, styled minimal
9. add_lower_third for each speaker on first appearance
10. auto_mix all audio to -16 LUFS for podcast standard
11. generate_subtitles as SRT file for accessibility
12. export at 1920x1080 mp4

If the podcast includes guest introductions, include their name/title lower thirds. Add chapter markers at each topic change.`
                    },
                }];
        }
        case "edit/tutorial": {
            const topic = args?.topic || "[INSERT TOPIC]";
            const includeIntro = args?.includeIntro !== "false";
            const style = args?.style || "mixed";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit this tutorial about "${topic}":

${includeIntro ? "1. add_title_card with the tutorial name using 'minimal_clean' style and a brief subtitle\n" : ""}
2. Cut any mistakes, long pauses, or repeated explanations
3. For screencast segments: add_callout with zoom_box to highlight clicked areas and UI elements
4. generate_subtitles with burned captions for key instructions
5. enhance_audio for clear voice quality
6. Add step number overlays for each major section
7. For product demonstrations: match_colors for consistent look, auto_white_balance if needed
8. ${style === "talking_head" ? "smart_crop to keep the presenter centered" : style === "screencast" ? "Stabilize any shaky screen recordings with stabilize_clip" : "smart_crop for talking head segments, add_callout for screencast segments"}
9. auto_mix audio to -16 LUFS
10. Apply a clean, professional color grade
${includeIntro ? "11. Add an end screen with subscribe call-to-action\n" : ""}

Keep tutorials clear and well-paced. Use freeze_frame at key demonstration points if needed. Add chapter markers.`
                    },
                }];
        }
        case "edit/product-review": {
            const productName = args?.productName || "[INSERT PRODUCT NAME]";
            const style = args?.style || "in_depth";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit this product review for "${productName}" (${style} style):

1. add_title_card with "${productName} Review" in 'bold_impact' style
2. Cut filler words and redundant statements: remove_filler_words
3. For B-roll product shots: apply_speed_ramp with slow-motion (0.5x) for key detail moments
4. Color grade the product shots: apply_color_grade 'cinematic' for product beauty shots, auto_white_balance for accuracy
5. ${style === "unboxing" ? "Add sound_effect 'whoosh' at unboxing reveal moment, freeze_frame at the reveal" : style === "comparison" ? "Use split_screen or side-by-side layout for comparison points" : "Add callouts with key specs and features as animated overlays"}
6. add_lower_third with product price and key specs
7. enhance_audio with 'vocal_boost' profile for the reviewer's voice
8. Add chapter markers: Unboxing, First Impressions, Features, Performance, Verdict
9. add_viral_captions with 'minimal' style for key review quotes
10. auto_mix audio to -14 LUFS for YouTube
11. generate_thumbnail with smartSelect enabled, overlay "${productName} — Full Review"
12. export at 4K resolution, h265 codec

End with pros/cons text overlay and final rating score.`
                    },
                }];
        }
        case "edit/wedding": {
            const durationType = args?.duration || "highlight";
            const style = args?.style || "cinematic";
            const durationMap = { teaser: "1-2 minutes", highlight: "5-8 minutes", feature: "15-25 minutes" };
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit a ${durationMap[durationType] || durationType} ${style} wedding video:

1. music search style recommendation: emotional piano/cinematic orchestral
2. auto_beat_sync all cuts to the music with medium sensitivity
3. ${style === "vintage" ? "apply_color_grade 'vintage' with kodak_2383 film stock and slight grain" : style === "documentary" ? "Use natural color grade, apply_lut with a warm documentary LUT" : "apply_color_grade 'cinematic' teal_orange, add crossfade transitions between scenes"}
4. Arrange clips chronologically: Getting Ready → Ceremony → Reception
5. add_crossfade with 'film_dissolve' type (2s duration) between major scenes
6. Key moments: freeze_frame at first look (3s), apply_speed_ramp slow-mo (0.5x) for first dance
7. Chroma key if any green screen photo booth footage: chroma_key
8. stabilize_clip any shaky handheld ceremony footage
9. add_title_card "${style === "modern" ? "neon_sign" : "elegant_serif"} style with couple's names at the start"
10. enhance_audio and reduce wind noise: audio_denoise with profile 'wind'
11. auto_mix audio to -23 LUFS for cinematic dynamic range
12. generate_subtitles for vows/speeches if needed
13. Export at 4K, ProRes for archival quality

Use ripple_delete to remove any unwanted sequences. Apply beauty_filter subtly (0.2 smoothing) for close-up portrait shots. Add film dissolve transitions throughout.`
                    },
                }];
        }
        case "edit/talking-head": {
            const style = args?.style || "vlog";
            const includeCaptions = args?.includeCaptions !== "false";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit this talking-head video (${style} style):

1. remove_background if shot on green screen — replace with a ${style === "vlog" ? "bright, clean room" : style === "educational" ? "dark gradient background" : "relevant setting"}
2. remove_filler_words aggressively (threshold: 0.7)
3. For long explanations: auto_fill_broll with topic-appropriate footage to cover the narration
4. ${includeCaptions ? "add_viral_captions with 'hormozi' style — ${args?.platform === 'tiktok' ? '9:16 vertical format' : '16:9 horizontal format'}" : ""}
5. Add jump cuts at natural breaks (+1.5x playback for less engaging sections): perform_trim_edit with ripple operation
6. enhance_audio with 'studio_podcast' profile
7. ${style === "storytime" ? "Add sound_effect 'suspense' and 'reveal' at key story moments" : style === "educational" ? "add_callout with highlight_box for key points and definitions" : "Add subtle background music: generate_soundtrack with mood 'ambient'"}
8. apply_beauty_retouch subtle (0.3) for professional appearance
9. extend background to handle aspect changes if needed
10. smart_crop ${args?.platform === 'tiktok' ? "to 9:16 with subject tracking" : "to ensure subject stays in frame"}
11. auto_mix to -14 LUFS
12. extract_viral_hook for a 5-second preview clip

For ${style === "vlog" ? "vlogs" : style === "educational" ? "educational content" : style} style: keep energy high, cut pauses, use dynamic zoom. End with subscribe call-to-action.`
                    },
                }];
        }
        case "edit/montage": {
            const theme = args?.theme || "sports";
            const musicStyle = args?.musicStyle || "epic orchestral";
            const paceMap = { fast: "0.5-1s per clip, rapid cuts", medium: "1-2s per clip, smooth cuts", slow: "2-4s per clip, lingering shots" };
            const pace = args?.pace || "medium";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit a ${theme} montage/highlight reel:

1. generate_soundtrack with mood '${theme === "sports" ? "epic" : theme === "travel" ? "cinematic" : "upbeat"}', genre '${musicStyle}'
2. auto_beat_sync all clip cuts to the music beats (high sensitivity)
3. ${paceMap[pace] || "1-2s per clip"}
4. Apply dramatic color grade: ${theme === "sports" ? "apply_film_look 'teal_orange_blockbuster' with high contrast" : theme === "travel" ? "apply_color_grade 'cinematic' with warm tones and add film grain" : "match_colors across all clips for consistency"}
5. Best moments: apply_speed_ramp with 0.25x speed and smooth ease_in_out for dramatic slow-mo on key shots
6. Add particle_system: ${theme === "sports" ? "sparks at high-energy moments" : theme === "travel" ? "subtle dust motes for atmosphere" : "confetti for celebrations"}
7. add_crossfade with 'film_dissolve' between scenes, 'glitch_dissolve' for energy shifts
8. add_title_card with bold impact style for the montage name
9. auto_mix audio to -14 LUFS, audio_denoise any background noise from clips
10. Export at 4K, h265, 60fps if source supports it

Build to a climax. Layer multiple clips (split screen) for high-energy moments. Use chroma_key if any source was shot on green screen.`
                    },
                }];
        }
        case "edit/interview": {
            const numPeople = args?.numPeople || "2";
            const style = args?.style || "two_camera";
            const includeGraphics = args?.includeGraphics !== "false";
            return [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Edit this ${numPeople}-person interview (${style} style):

1. diarize_speakers for ${numPeople} speakers
2. transcribe the full interview
3. ${style === "multicam" || style === "two_camera" ? `setup_multicam with ${style === "multicam" ? numPeople : "2"} angles. Auto-switch to the active speaker.` : "Cut between speakers naturally on question/response boundaries."}
4. remove_filler_words (threshold: 0.6) for clean responses
5. If ${style === "multicam"}: match_colors between all camera angles
6. enhance_audio for each speaker channel individually (studio_podcast profile)
7. ${includeGraphics ? `add_lower_third with ${numPeople === "2" ? "'dual_name' style" : "'corporate_clean' style"} for each person on first appearance, including their name and title/role\nadd_title_card with interview topic in 'elegant_serif' style` : ""}
8. For responses referencing specific subjects: auto_fill_broll with relevant footage
9. chroma_key if any footage was shot on green screen
10. add_crossfade with 'film_dissolve' (1s) between topic segments
11. auto_mix all audio to -23 LUFS for broadcast quality
12. generate_subtitles as embedded SRT for accessibility
13. generate_thumbnail with smartSelect — choose an engaging moment with both speakers visible
14. Export 1080p, h264 for wide compatibility

Add chapter markers at each topic/question change. Remove any technical issues or long setup/microphone adjustment segments with ripple_delete. Apply beauty_filter (0.2) subtly for close-up shots.`
                    },
                }];
        }
        default:
            return [{
                    role: "assistant",
                    content: {
                        type: "text",
                        text: `Unknown prompt template: ${name}`,
                    },
                }];
    }
}
// ═════════════════════════════════════════════════════════════════
// Handlers
// ═════════════════════════════════════════════════════════════════
/**
 * Handler: tools/list — advertises all Lazynext tools to MCP clients.
 */
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        })),
    };
});
/**
 * Handler: tools/call — executes a tool by forwarding to the AI Agents
 * orchestrator or directly to the appropriate microservice.
 */
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    const args = (request.params.arguments ?? {});
    const tool = TOOLS.find((t) => t.name === name);
    // Optional PoW captcha verification for MCP tool calls
    if (process.env.MCP_REQUIRE_POW === "true") {
        const { verifyPowToken } = await import("./captcha.js");
        const powToken = args._pow_token || "";
        if (!(await verifyPowToken(powToken))) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Proof-of-work verification required. Include a valid _pow_token in your tool arguments.",
                    },
                ],
                isError: true,
            };
        }
    }
    if (!tool) {
        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    try {
        const headers = {
            "Content-Type": "application/json",
        };
        if (API_KEY) {
            headers["X-API-Key"] = API_KEY;
        }
        // Route: core editing tools go through orchestrator
        if (name === "autonomous_edit" ||
            name === "transcribe" ||
            name === "remove_filler_words" ||
            name === "diarize_speakers" ||
            name === "edit_via_transcript") {
            const prompt = typeof args.prompt === "string"
                ? args.prompt
                : `${name}: ${JSON.stringify(args)}`;
            const resp = await fetch(`${AI_AGENTS_URL}/orchestrate`, {
                method: "POST",
                headers,
                body: JSON.stringify({ prompt, projectId: args.projectId }),
            });
            const data = await resp.json();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };
        }
        if (name === "export_project" ||
            name === "render" ||
            name === "render_section" ||
            name === "export_gif" ||
            name === "export_proxy" ||
            name === "generate_thumbnail") {
            const resp = await fetch(`${API_GATEWAY_URL}/api/v1/export`, {
                method: "POST",
                headers,
                body: JSON.stringify(args),
            });
            const data = await resp.json();
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        if (name === "get_timeline_state" ||
            name === "get_project_info" ||
            name === "duplicate_project" ||
            name === "archive_project") {
            const endpoint = name === "duplicate_project"
                ? `${API_GATEWAY_URL}/api/v1/projects/${args.projectId}/duplicate`
                : name === "archive_project"
                    ? `${API_GATEWAY_URL}/api/v1/projects/${args.projectId}/archive`
                    : `${API_GATEWAY_URL}/api/v1/projects/${args.projectId || "current"}`;
            const method = name === "duplicate_project" || name === "archive_project" ? "POST" : "GET";
            const resp = await fetch(endpoint, {
                method,
                headers,
                ...(method === "POST" ? { body: JSON.stringify(args) } : {}),
            });
            const data = await resp.json();
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        // Route: scheduled routines, channels, and background tasks → API Gateway
        if (name === "schedule_routine" ||
            name === "list_routines" ||
            name === "cancel_routine" ||
            name === "register_webhook_channel" ||
            name === "enqueue_background_task" ||
            name === "get_task_status") {
            let endpoint;
            let method = "GET";
            let body;
            switch (name) {
                case "schedule_routine":
                    endpoint = `${API_GATEWAY_URL}/api/v1/routines`;
                    method = "POST";
                    body = JSON.stringify({
                        name: args.name,
                        cron_expression: args.cronExpression,
                        prompt: args.prompt,
                        enabled: args.enabled !== false,
                    });
                    break;
                case "list_routines":
                    endpoint = `${API_GATEWAY_URL}/api/v1/routines`;
                    break;
                case "cancel_routine":
                    endpoint = `${API_GATEWAY_URL}/api/v1/routines/${args.routineId}`;
                    method = "DELETE";
                    break;
                case "register_webhook_channel":
                    endpoint = `${API_GATEWAY_URL}/api/v1/channels/webhook`;
                    method = "POST";
                    body = JSON.stringify({
                        channel: args.channel,
                        url: args.url,
                        secret: args.secret,
                    });
                    break;
                case "enqueue_background_task":
                    endpoint = `${API_GATEWAY_URL}/api/v1/tasks`;
                    method = "POST";
                    body = JSON.stringify({
                        name: args.name,
                        payload: args.payload,
                        task_type: args.taskType,
                        priority: args.priority || 100,
                    });
                    break;
                case "get_task_status":
                    endpoint = `${API_GATEWAY_URL}/api/v1/tasks/${args.taskId}`;
                    break;
                default:
                    endpoint = `${API_GATEWAY_URL}/api/v1/routines`;
            }
            const resp = await fetch(endpoint, {
                method,
                headers,
                ...(body ? { body } : {}),
            });
            const data = await resp.json();
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        }
        // All other tools: forward to orchestrator with tool name as intent
        // Sanitize: truncate each value to prevent prompt injection via oversized args
        const argsEntries = Object.entries(args || {}).slice(0, 100).map(([k, v]) => {
            const val = String(v ?? "");
            return `${k}: ${val.slice(0, 1000)}`;
        });
        const toolPrompt = `${name} ${argsEntries.join(", ")}`.slice(0, 10000);
        const resp = await fetch(`${AI_AGENTS_URL}/orchestrate`, {
            method: "POST",
            headers,
            body: JSON.stringify({ prompt: toolPrompt, projectId: args?.projectId }),
        });
        const data = await resp.json();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to execute ${name}: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});
/**
 * Handler: resources/list — advertises all Lazynext resources.
 */
server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => {
    return {
        resources: RESOURCES.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
        })),
    };
});
/**
 * Handler: resources/read — resolves a resource URI to its content.
 */
server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const resource = RESOURCES.find((r) => r.uri === uri);
    if (!resource) {
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({ error: `Unknown resource: ${uri}` }),
                },
            ],
        };
    }
    return {
        contents: [
            {
                uri,
                mimeType: resource.mimeType,
                text: resolveResourceContent(uri),
            },
        ],
    };
});
/**
 * Handler: prompts/list — advertises all Lazynext prompt templates.
 */
server.setRequestHandler(types_js_1.ListPromptsRequestSchema, async () => {
    return {
        prompts: PROMPTS.map((p) => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments || [],
        })),
    };
});
/**
 * Handler: prompts/get — resolves a prompt template name to actual messages.
 */
server.setRequestHandler(types_js_1.GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    const prompt = PROMPTS.find((p) => p.name === name);
    if (!prompt) {
        return {
            messages: [
                {
                    role: "assistant",
                    content: {
                        type: "text",
                        text: `Unknown prompt template: ${name}. Available: ${PROMPTS.map((p) => p.name).join(", ")}`,
                    },
                },
            ],
        };
    }
    return {
        messages: resolvePromptContent(name, promptArgs),
    };
});
// ═════════════════════════════════════════════════════════════════
// Graceful shutdown
// ═════════════════════════════════════════════════════════════════
let isShuttingDown = false;
async function shutdown(signal) {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.error(`Lazynext MCP Server shutting down (${signal})...`);
    try {
        await server.close();
    }
    catch (_) {
        // Server may already be closed
    }
    process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
// ═════════════════════════════════════════════════════════════════
// Bootstrap
// ═════════════════════════════════════════════════════════════════
async function run() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error(`Lazynext MCP Server v2.0.0 running on stdio (${TOOLS.length} tools, ${RESOURCES.length} resources, ${PROMPTS.length} prompts)`);
}
run().catch(console.error);
