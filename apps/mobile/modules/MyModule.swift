import Foundation

/// iOS native module — wires React Native to the Lazynext Rust core via UniFFI.
///
/// Calls real UniFFI-generated Swift bindings from lazynext_mobile.swift.
/// On error (library not loaded, engine not initialized), falls back to
/// graceful degradation with error messages.
enum MyModuleStub {

    private static var engineInitialized = false

    private static func ensureInit() {
        guard !engineInitialized else { return }
        do {
            let _ = lazynext_mobile.initEngine(sessionId: "ios_session", projectName: "Lazynext Mobile", framerate: 24)
            engineInitialized = true
        } catch {
            NSLog("[LazynextMobile] UniFFI engine init failed: \(error.localizedDescription). Using stub responses.")
        }
    }

    static func getProjectInfo() -> String {
        ensureInit()
        guard engineInitialized else {
            return jsonString(from: ["name": "Lazynext Project (Offline)", "tracks": [], "error": "Rust engine unavailable"])
        }
        do {
            return lazynext_mobile.getProjectInfo()
        } catch {
            NSLog("[LazynextMobile] getProjectInfo failed: \(error.localizedDescription)")
            return jsonString(from: ["name": "Lazynext Project (Offline)", "tracks": [], "error": "Rust engine unavailable"])
        }
    }

    static func processIntent(prompt: String, requireApproval: Bool) -> String {
        ensureInit()
        guard engineInitialized else {
            return jsonString(from: ["success": false, "error": "Rust engine unavailable. Start api-gateway for AI capabilities."])
        }
        do {
            return lazynext_mobile.processIntent(prompt: prompt, requireApproval: requireApproval)
        } catch {
            NSLog("[LazynextMobile] processIntent failed: \(error.localizedDescription)")
            return jsonString(from: ["success": false, "error": "Rust engine unavailable. Start api-gateway for AI capabilities."])
        }
    }

    static func sendChatMessage(message: String) -> String {
        ensureInit()
        guard engineInitialized else {
            return jsonString(from: ["success": false, "error": "Chronos Copilot is offline. Connect to api-gateway."])
        }
        do {
            return lazynext_mobile.processIntent(prompt: message, requireApproval: true)
        } catch {
            NSLog("[LazynextMobile] sendChatMessage failed: \(error.localizedDescription)")
            return jsonString(from: ["success": false, "error": "Chronos Copilot is offline. Connect to api-gateway."])
        }
    }

    static func moveClip(clipId: String, newStartFrame: UInt64) -> String {
        ensureInit()
        guard engineInitialized else {
            return jsonString(from: ["success": false, "error": "Rust engine unavailable"])
        }
        do {
            return lazynext_mobile.moveClip(clipId: clipId, newStart: UInt32(newStartFrame))
        } catch {
            NSLog("[LazynextMobile] moveClip failed: \(error.localizedDescription)")
            return jsonString(from: ["success": false, "error": "Rust engine unavailable"])
        }
    }

    private static func jsonString(from dict: [String: Any]) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: []),
              let json = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return json
    }
}
