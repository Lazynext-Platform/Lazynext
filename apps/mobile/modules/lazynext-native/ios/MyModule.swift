import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    AsyncFunction("getProjectInfo") { () -> String in
      return try getProjectInfo()
    }

    AsyncFunction("processIntent") { (prompt: String, requireApproval: Bool) -> String in
      return try processIntent(prompt: prompt, requireApproval: requireApproval)
    }

    AsyncFunction("addClip") { (trackIndex: UInt32, clipType: String, name: String, start: UInt32, end: UInt32) -> String in
      return try addClip(trackIndex: trackIndex, clipType: clipType, name: name, start: start, end: end)
    }

    AsyncFunction("moveClip") { (clipId: String, newStart: UInt32) -> String in
      return try moveClip(clipId: clipId, newStart: newStart)
    }
  }
}
