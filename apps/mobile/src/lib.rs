// Lazynext Mobile Engine Entry Point
// This library exposes C API bindings for iOS (Swift) and Android (JNI/Kotlin)
// to orchestrate the core compositor.

use state::ProjectData;

#[unsafe(no_mangle)]
pub extern "C" fn lazynext_mobile_init() {
    println!("Lazynext Mobile Engine Initialized!");
    let _project = ProjectData::new("proj_mobile".into(), "Lazynext Mobile Engine".into(), 60.0, 1080, 1920);
    println!("Mobile Engine successfully linked to core NLE state!");
    // In a real implementation, we would bind the wgpu compositor to the
    // CAMetalLayer (iOS) or SurfaceTexture (Android) here.
}

#[unsafe(no_mangle)]
pub extern "C" fn lazynext_mobile_voice_prompt(prompt_ptr: *const std::ffi::c_char) {
    println!("Received Voice-First Agentic Prompt via JNI/Swift bindings.");
    // Route prompt to MCP backend and mutate ProjectData autonomously.
}
