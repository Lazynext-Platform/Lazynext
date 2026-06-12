use lazynext_core::NLEState;
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};
use rand::Rng;

#[tokio::main]
async fn main() {
    println!("🧠 Lazynext 2025 Neural-Link (BCI) Interface Booting...");
    sleep(Duration::from_millis(500)).await;

    // Connect to the shared CRDT network session
    println!("📡 Connecting to CRDT Session [Project: mind_edit_v1]...");
    let state = Arc::new(Mutex::new(NLEState::new(
        "mind_edit_v1".to_string(),
        "Neural Cut 1".to_string(),
        24
    )));

    println!("✅ Session joined. Calibrating EEG Headset...");
    sleep(Duration::from_millis(1500)).await;
    println!("🟢 Calibration complete. Polling raw brainwave frequencies.");

    let mut rng = rand::thread_rng();

    // Neuro-polling loop
    for _ in 0..5 {
        sleep(Duration::from_millis(2000)).await;
        
        let beta_wave_intensity: f32 = rng.gen_range(0.0..10.0);
        let artifact_detected = rng.gen_bool(0.2); // 20% chance of double blink

        if beta_wave_intensity > 8.0 {
            println!("🧠 [EEG SPIKE] Intense Concentration detected (Beta: {:.2}). Dispatching 'SPLIT_CLIP' to CRDT...", beta_wave_intensity);
            // Emulate CRDT split action
            let s = state.lock().unwrap();
            println!("   -> CRDT Event Mutated: Split Clip at playhead.");
        } else if artifact_detected {
            println!("👀 [EEG ARTIFACT] Double-blink detected. Dispatching 'PLAY/PAUSE' to CRDT...");
            let s = state.lock().unwrap();
            println!("   -> CRDT Event Mutated: Playback Toggled.");
        } else {
            println!("〰️  [EEG NORMAL] Alpha waves steady. Watching playback...");
        }
    }

    println!("🛑 User disconnected headset. BCI Daemon Shutting Down.");
}
