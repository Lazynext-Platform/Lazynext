package com.lazynext.mobile.modules

/**
 * Android stub — defines the bridge contract for the Lazynext mobile app.
 *
 * Implementations return mock data so the RN shell has realistic content
 * even when the native Rust core library is not compiled for the device.
 *
 * Real implementations live in:
 *   modules/lazynext-native/android/src/main/java/com/lazynext/lazynextnative/MyModule.kt
 */
object MyModuleStub {

    fun getProjectInfo(): String {
        return """
        {
            "name": "Demo Cut (Android Stub)",
            "tracks": [
                {
                    "id": "track_1",
                    "name": "Video",
                    "trackType": "video",
                    "clips": [
                        {"id": "clip_001", "name": "Opening Shot", "start": 0, "duration": 150},
                        {"id": "clip_002", "name": "B-Roll Montage", "start": 150, "duration": 210},
                        {"id": "clip_003", "name": "Hero Close-up", "start": 360, "duration": 90}
                    ]
                },
                {
                    "id": "track_2",
                    "name": "Audio",
                    "trackType": "audio",
                    "clips": [
                        {"id": "clip_004", "name": "Background Music", "start": 0, "duration": 450}
                    ]
                }
            ]
        }
        """.trimIndent()
    }

    fun processIntent(prompt: String, requireApproval: Boolean): String {
        return """
        {
            "success": true,
            "message": "Processed intent: $prompt (stub — Rust core not loaded)"
        }
        """.trimIndent()
    }

    fun sendChatMessage(message: String): String {
        return """
        {
            "success": true,
            "message": "Chronos Copilot stub: received '$message'. Connect to api-gateway for full AI capabilities."
        }
        """.trimIndent()
    }

    fun moveClip(clipId: String, newStartFrame: Long): String {
        return """
        {
            "success": true,
            "message": "Moved clip $clipId to frame $newStartFrame (stub)"
        }
        """.trimIndent()
    }
}
