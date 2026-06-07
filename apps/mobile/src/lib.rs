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
    if prompt_ptr.is_null() {
        return;
    }
    let c_str = unsafe { std::ffi::CStr::from_ptr(prompt_ptr) };
    let prompt = match c_str.to_str() {
        Ok(s) => s.to_string(),
        Err(_) => return,
    };
    
    println!("Received Voice-First Agentic Prompt via JNI/Swift bindings: {}", prompt);
    
    // Spawn a lightweight one-shot Tokio runtime to execute the LLM call natively
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let provider = std::env::var("LAZYNEXT_AI_PROVIDER").unwrap_or_else(|_| "ollama".to_string());
            let model = std::env::var("LAZYNEXT_AI_MODEL").unwrap_or_else(|_| "".to_string());
            let api_key = std::env::var("LAZYNEXT_API_KEY").unwrap_or_else(|_| "mock".to_string());
            
            if let Ok(agent) = agent::AgentFactory::create(&provider, &model, &api_key)
                && let Ok(res) = agent.send_prompt(&prompt).await
            {
                println!("Mobile Agent Output:\n{:?}", res);
            }
        });
    });
}
