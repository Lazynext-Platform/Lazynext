// MyModule.kt — Lazynext Android native bridge.
// Exposes project info, AI intent processing, and clip CRUD to React Native
// via Expo Modules.  Delegates to the Rust UniFFI bindings for core logic.

package expo.modules.mymodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import uniffi.lazynext_mobile.*

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    AsyncFunction("getProjectInfo") { ->
      getProjectInfo()
    }

    AsyncFunction("processIntent") { prompt: String, requireApproval: Boolean ->
      processIntent(prompt, requireApproval)
    }

    AsyncFunction("addClip") { trackIndex: Long, clipType: String, name: String, start: Long, end: Long ->
      addClip(trackIndex.toUInt(), clipType, name, start.toUInt(), end.toUInt())
    }

    AsyncFunction("moveClip") { clipId: String, newStart: Long ->
      moveClip(clipId, newStart.toUInt())
    }
  }
}
