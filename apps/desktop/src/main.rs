//! GPUI desktop application entry point.
//!
//! Initialises the CoreEngine, sets up the main window with the
//! dashboard, and starts the native event loop.  All business logic
//! lives in `rust/core/`; this file is a thin rendering shell.

use gpui::prelude::*;
use gpui::*;
use lazynext_core::NLEState;
use std::sync::Arc;
use tokio::sync::Mutex;

mod dashboard;
use dashboard::Dashboard;

mod auth;
mod editor;
mod theme;

// GPUI takes over the main thread, so we run a standard main function.
fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    log::info!("🎬 Lazynext Desktop starting...");

    // We can run async code inside GPUI, but we'll instantiate our NLEState here.
    let rt = tokio::runtime::Runtime::new().unwrap();
    let nle = Arc::new(Mutex::new(NLEState::new(
        "desktop_session_1".to_string(),
        "Desktop Project".to_string(),
        24,
    )));

    rt.block_on(async {
        let mut state = nle.lock().await;
        state.add_track("V1".to_string(), "video".to_string());
        state.add_track("A1".to_string(), "audio".to_string());
        log::info!(
            "NLE engine ready: {} tracks",
            state.get_project_data().tracks.len()
        );
    });

    let engine = Arc::new(Mutex::new(rt.block_on(async {
        let e = lazynext_core::engine::CoreEngine::init(nle.clone())
            .await
            .unwrap();
        e.enable_decklink().await;
        e
    })));

    log::info!("Entering native event loop...");
    let theme = Arc::new(theme::Theme::auto());
    log::info!("Theme: {:?}", theme.mode);

    let nle_clone = nle.clone();
    let engine_clone = engine.clone();
    let rt_handle = rt.handle().clone();
    let theme_clone = theme.clone();

    Application::new().run(move |cx: &mut App| {
        let bounds = Bounds {
            origin: point(px(0.0), px(0.0)),
            size: size(px(800.0), px(600.0)),
        };
        let _ = cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some("Lazynext Dashboard".into()),
                    appears_transparent: true,
                    traffic_light_position: None,
                }),
                ..Default::default()
            },
            |_, cx| cx.new(|_cx| Dashboard::new(nle_clone, engine_clone, rt_handle, theme_clone)),
        );
    });
}
