package com.lazynext.lazynextnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

/**
 * Lazynext Native Bridge for Android.
 *
 * Bridges React Native to the Rust NLE core via UniFFI-generated FFI bindings.
 * Mirrors the iOS MyModule.swift implementation (lazynext_mobile.swift).
 *
 * To generate UniFFI bindings:
 *   1. Define .udl file in rust/core/
 *   2. Run: uniffi-bindgen generate --language kotlin
 *   3. Place generated bindings in rust/target/
 */
class MyModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("MyModule")

        AsyncFunction("fetchProject") { promise: Promise ->
            try {
                val projectJson = nativeFetchProject()
                promise.resolve(projectJson)
            } catch (e: Exception) {
                // Fallback when Rust library is not loaded
                promise.resolve(
                    """
                    {
                        "id": "mobile_android_001",
                        "name": "Mobile Project (Android)",
                        "tracks": [],
                        "clips": []
                    }
                    """.trimIndent()
                )
            }
        }

        AsyncFunction("processIntent") { prompt: String, promise: Promise ->
            try {
                val result = nativeProcessIntent(prompt)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.resolve(
                    """
                    {
                        "success": false,
                        "message": "Rust engine not loaded. Connect to api-gateway for full agentic capabilities."
                    }
                    """.trimIndent()
                )
            }
        }

        AsyncFunction("sendChatMessage") { message: String, promise: Promise ->
            try {
                val response = nativeSendChatMessage(message)
                promise.resolve(response)
            } catch (e: Exception) {
                promise.resolve(
                    """
                    {
                        "success": false,
                        "message": "AI agent unavailable. Start the ai-agents service (port 8002) for chat capabilities."
                    }
                    """.trimIndent()
                )
            }
        }

        AsyncFunction("moveClip") { clipId: String, newPosition: Double, promise: Promise ->
            try {
                val result = nativeMoveClip(clipId, newPosition.toFloat())
                promise.resolve(result)
            } catch (e: Exception) {
                promise.resolve(
                    """
                    {
                        "success": false,
                        "message": "Rust engine not loaded."
                    }
                    """.trimIndent()
                )
            }
        }
    }

    // ── Native Rust FFI Functions ──────────────────────────────────────
    // These call into the lazynext_core Rust library via UniFFI bindings.
    // When the Rust .so is loaded, the native calls succeed; otherwise
    // fall back to the JS-level graceful degradation in the methods above.

    private external fun nativeFetchProject(): String
    private external fun nativeProcessIntent(prompt: String): String
    private external fun nativeSendChatMessage(message: String): String
    private external fun nativeMoveClip(clipId: String, newPosition: Float): String

    companion object {
        init {
            try {
                System.loadLibrary("lazynext_core")
            } catch (e: UnsatisfiedLinkError) {
                android.util.Log.w(
                    "MyModule",
                    "Rust library 'lazynext_core' not loaded — using JS fallback. " +
                    "Build with: cargo build --target aarch64-linux-android --release"
                )
            }
        }
    }
}
