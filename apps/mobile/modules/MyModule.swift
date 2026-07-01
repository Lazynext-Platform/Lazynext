import Foundation

/// iOS stub — defines the bridge contract for the Lazynext mobile app.
///
/// Returns mock data so the RN shell has realistic content even when the
/// native Rust core library is not compiled for the device.
///
/// Real implementation at:
///   modules/lazynext-native/ios/MyModule.swift
enum MyModuleStub {

    static func getProjectInfo() -> String {
        let mock: [String: Any] = [
            "name": "Demo Cut (iOS Stub)",
            "tracks": [
                [
                    "id": "track_1",
                    "name": "Video",
                    "trackType": "video",
                    "clips": [
                        ["id": "clip_001", "name": "Opening Shot", "start": 0, "duration": 150],
                        ["id": "clip_002", "name": "B-Roll Montage", "start": 150, "duration": 210],
                        ["id": "clip_003", "name": "Hero Close-up", "start": 360, "duration": 90]
                    ]
                ],
                [
                    "id": "track_2",
                    "name": "Audio",
                    "trackType": "audio",
                    "clips": [
                        ["id": "clip_004", "name": "Background Music", "start": 0, "duration": 450]
                    ]
                ]
            ]
        ]
        return jsonString(from: mock)
    }

    static func processIntent(prompt: String, requireApproval: Bool) -> String {
        let mock: [String: Any] = [
            "success": true,
            "message": "Processed intent: \(prompt) (stub — Rust core not loaded)"
        ]
        return jsonString(from: mock)
    }

    static func sendChatMessage(message: String) -> String {
        let mock: [String: Any] = [
            "success": true,
            "message": "Chronos Copilot stub: received '\(message)'. Connect to api-gateway for full AI capabilities."
        ]
        return jsonString(from: mock)
    }

    static func moveClip(clipId: String, newStartFrame: UInt64) -> String {
        let mock: [String: Any] = [
            "success": true,
            "message": "Moved clip \(clipId) to frame \(newStartFrame) (stub)"
        ]
        return jsonString(from: mock)
    }

    private static func jsonString(from dict: [String: Any]) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: []),
              let json = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return json
    }
}
