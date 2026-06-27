import Foundation
import React

/// Lazynext Mobile iOS Bridge
///
/// Initializes the Rust NLE engine via UniFFI-generated Swift bindings
/// and exposes it to React Native through a native module.
///
/// UniFFI generates the Swift bindings from rust/core/uniffi/lazynext.udl.
/// After running `uniffi-bindgen generate ... --language swift`, the
/// generated `lazynext_mobile.swift` file should be added to this target.

@objc(LazynextBridge)
class LazynextBridge: RCTEventEmitter {
    
    private var engineInitialized = false
    private var engineHandle: UnsafeMutableRawPointer?
    
    // MARK: - Module Setup
    
    override static func moduleName() -> String {
        return "LazynextBridge"
    }
    
    override func supportedEvents() -> [String] {
        return [
            "onEngineInitialized",
            "onEditComplete",
            "onError"
        ]
    }
    
    @objc
    static override func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Engine Lifecycle
    
    @objc
    func initialize(_ sessionId: String, 
                    projectName: String, 
                    framerate: Int,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            do {
                // In production: initialize the UniFFI-generated Rust engine
                // let engine = try LazynextMobile.initEngine(
                //     sessionId: sessionId,
                //     projectName: projectName,
                //     framerate: UInt32(framerate)
                // )
                // self.engineHandle = engine
                
                self.engineInitialized = true
                
                self.sendEvent(withName: "onEngineInitialized", body: [
                    "sessionId": sessionId,
                    "projectName": projectName,
                    "framerate": framerate
                ])
                
                resolve([
                    "initialized": true,
                    "sessionId": sessionId
                ])
            } catch {
                reject("INIT_ERROR", "Failed to initialize engine: \(error.localizedDescription)", error)
            }
        }
    }
    
    // MARK: - Project Operations
    
    @objc
    func getProjectInfo(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard engineInitialized else {
            reject("NOT_INITIALIZED", "Engine not initialized", nil)
            return
        }
        
        // In production: call UniFFI-generated getProjectInfo()
        let info: [String: Any] = [
            "name": "iOS Project",
            "id": "ios_session",
            "framerate": 24,
            "width": 1920,
            "height": 1080,
            "trackCount": 2,
            "clipCount": 4
        ]
        resolve(info)
    }
    
    @objc
    func processIntent(_ prompt: String,
                       requireApproval: Bool,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard engineInitialized else {
            reject("NOT_INITIALIZED", "Engine not initialized", nil)
            return
        }
        
        // In production: call UniFFI-generated processIntent()
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            var message = "Processed intent."
            let lower = prompt.lowercased()
            if lower.contains("cut") || lower.contains("silence") {
                message = "Trimmed silence from audio tracks."
            } else if lower.contains("music") {
                message = "Added cinematic background score."
            } else if lower.contains("color") || lower.contains("grade") {
                message = "Applied cinematic color grade."
            }
            
            self?.sendEvent(withName: "onEditComplete", body: [
                "prompt": prompt,
                "message": message
            ])
            
            resolve(["success": true, "message": message])
        }
    }
    
    @objc
    func getTimelineState(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard engineInitialized else {
            reject("NOT_INITIALIZED", "Engine not initialized", nil)
            return
        }
        
        // In production: call UniFFI-generated getTimelineState()
        let state: [String: Any] = [
            "id": "ios_session",
            "name": "iOS Project",
            "framerate": 24,
            "width": 1920,
            "height": 1080,
            "tracks": [
                [
                    "id": "V1",
                    "kind": "video",
                    "clips": [
                        ["id": "clip_1", "type": "video", "name": "Main", "start": 0, "end": 300]
                    ]
                ]
            ]
        ]
        resolve(state)
    }
    
    @objc
    func undo(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard engineInitialized else {
            reject("NOT_INITIALIZED", "Engine not initialized", nil)
            return
        }
        resolve(["success": true])
    }
    
    @objc
    func redo(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard engineInitialized else {
            reject("NOT_INITIALIZED", "Engine not initialized", nil)
            return
        }
        resolve(["success": true])
    }
    
    @objc
    func getStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve([
            "initialized": engineInitialized,
            "processing": false,
            "currentProject": "iOS Project",
            "operationCount": 0,
            "peerId": "ios-peer-001"
        ])
    }
}
