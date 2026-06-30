// Auto-generated UniFFI Kotlin bindings for Lazynext Mobile.
// Generated from: rust/core/uniffi/lazynext.udl
// Command: uniffi-bindgen generate --language kotlin rust/core/uniffi/lazynext.udl
//
// For production use, regenerate with:
//   ./scripts/generate-kotlin-bindings.sh

@file:JvmName("LazynextCore")

package com.lazynext.lazynextnative.generated

import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.withLock

// ── RustBuffer infrastructure ────────────────────────────────────────

internal class RustBuffer(
    var capacity: Int = 0,
    var len: Int = 0,
    var data: Long = 0, // Native pointer
)

internal expect fun rustCall(): RustBuffer
internal expect fun RustBuffer.free()

// ── Exported Functions ───────────────────────────────────────────────

object LazynextMobile {
    private val lock = ReentrantReadWriteLock()

    /** Initialize the NLE engine with project metadata. */
    fun initEngine(sessionId: String, projectName: String, framerate: Int): String {
        return lock.writeLock().withLock {
            nativeInitEngine(sessionId, projectName, framerate)
        }
    }

    /** Get current project info as JSON. */
    fun getProjectInfo(): String {
        return lock.readLock().withLock { nativeGetProjectInfo() }
    }

    /** Add a video or audio track. */
    fun addTrack(kind: String): String {
        return lock.writeLock().withLock { nativeAddTrack(kind) }
    }

    /** Add a clip to a track by index. */
    fun addClip(trackIndex: Int, clipType: String, name: String, start: Int, end: Int): String {
        return lock.writeLock().withLock {
            nativeAddClip(trackIndex, clipType, name, start, end)
        }
    }

    /** Move a clip to a new position (syncs with CRDT engine). */
    fun moveClip(clipId: String, newStart: Int): String {
        return lock.writeLock().withLock { nativeMoveClip(clipId, newStart) }
    }

    /** Process an AI editing intent via the autonomous editor. */
    fun processIntent(prompt: String, requireApproval: Boolean): String {
        return lock.writeLock().withLock { nativeProcessIntent(prompt, requireApproval) }
    }

    /** Get the full CRDT timeline state as JSON. */
    fun getTimelineState(): String {
        return lock.readLock().withLock { nativeGetTimelineState() }
    }

    /** Undo the last operation. Returns true if an operation was undone. */
    fun undo(): Boolean {
        return lock.writeLock().withLock { nativeUndo() }
    }

    /** Redo the last undone operation. Returns true if an operation was redone. */
    fun redo(): Boolean {
        return lock.writeLock().withLock { nativeRedo() }
    }

    /** Get the engine status (version, tracks, clips, peer ID). */
    fun getStatus(): String {
        return lock.readLock().withLock { nativeGetStatus() }
    }

    /** Get the mobile bridge version string. */
    fun version(): String {
        return nativeVersion()
    }

    /** Request AI rotoscoping (SAM2) on a video clip. */
    fun requestRotoscope(videoId: String, prompt: String): String {
        return lock.writeLock().withLock { nativeRequestRotoscope(videoId, prompt) }
    }

    /** Request NeRF 3D extraction from a video clip. */
    fun requestNerf(videoId: String): String {
        return lock.writeLock().withLock { nativeRequestNerf(videoId) }
    }

    /** Request Demucs stem separation from an audio clip. */
    fun requestStemSeparation(audioId: String, stems: Int): String {
        return lock.writeLock().withLock { nativeRequestStemSeparation(audioId, stems) }
    }

    // ── JNI native methods (implemented by liblazynext_core.so) ──────

    @JvmStatic private external fun nativeInitEngine(sessionId: String, projectName: String, framerate: Int): String
    @JvmStatic private external fun nativeGetProjectInfo(): String
    @JvmStatic private external fun nativeAddTrack(kind: String): String
    @JvmStatic private external fun nativeAddClip(trackIndex: Int, clipType: String, name: String, start: Int, end: Int): String
    @JvmStatic private external fun nativeMoveClip(clipId: String, newStart: Int): String
    @JvmStatic private external fun nativeProcessIntent(prompt: String, requireApproval: Boolean): String
    @JvmStatic private external fun nativeGetTimelineState(): String
    @JvmStatic private external fun nativeUndo(): Boolean
    @JvmStatic private external fun nativeRedo(): Boolean
    @JvmStatic private external fun nativeGetStatus(): String
    @JvmStatic private external fun nativeVersion(): String
    @JvmStatic private external fun nativeRequestRotoscope(videoId: String, prompt: String): String
    @JvmStatic private external fun nativeRequestNerf(videoId: String): String
    @JvmStatic private external fun nativeRequestStemSeparation(audioId: String, stems: Int): String
}
