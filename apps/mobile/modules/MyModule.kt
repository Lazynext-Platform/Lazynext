package com.lazynext.mobile.modules

import uniffi.lazynext_mobile.*

/**
 * Android native module — wires React Native to the Lazynext Rust core via UniFFI.
 *
 * Calls real UniFFI-generated bindings. On error (library not loaded, engine not
 * initialized), falls back to graceful degradation with error messages.
 */
object MyModuleStub {

    private var engineInitialized = false

    private fun ensureInit() {
        if (!engineInitialized) {
            try {
                initEngine("android_session", "Lazynext Mobile", 24u)
                engineInitialized = true
            } catch (e: Exception) {
                android.util.Log.w("LazynextMobile", "UniFFI engine init failed: ${e.message}. Using stub responses.")
            }
        }
    }

    fun getProjectInfo(): String {
        ensureInit()
        return try {
            if (engineInitialized) {
                getProjectInfo()
            } else {
                throw RuntimeException("Engine not initialized")
            }
        } catch (e: Exception) {
            android.util.Log.w("LazynextMobile", "getProjectInfo failed: ${e.message}")
            """{"name":"Lazynext Project (Offline)","tracks":[],"error":"Rust engine unavailable"}"""
        }
    }

    fun processIntent(prompt: String, requireApproval: Boolean): String {
        ensureInit()
        return try {
            if (engineInitialized) {
                processIntent(prompt, requireApproval)
            } else {
                throw RuntimeException("Engine not initialized")
            }
        } catch (e: Exception) {
            android.util.Log.w("LazynextMobile", "processIntent failed: ${e.message}")
            """{"success":false,"error":"Rust engine unavailable. Start api-gateway for AI capabilities."}"""
        }
    }

    fun sendChatMessage(message: String): String {
        ensureInit()
        return try {
            if (engineInitialized) {
                processIntent(message, true)
            } else {
                throw RuntimeException("Engine not initialized")
            }
        } catch (e: Exception) {
            android.util.Log.w("LazynextMobile", "sendChatMessage failed: ${e.message}")
            """{"success":false,"error":"Chronos Copilot is offline. Connect to api-gateway."}"""
        }
    }

    fun moveClip(clipId: String, newStartFrame: Long): String {
        ensureInit()
        return try {
            if (engineInitialized) {
                moveClip(clipId, newStartFrame.toUInt())
            } else {
                throw RuntimeException("Engine not initialized")
            }
        } catch (e: Exception) {
            android.util.Log.w("LazynextMobile", "moveClip failed: ${e.message}")
            """{"success":false,"error":"Rust engine unavailable"}"""
        }
    }
}
