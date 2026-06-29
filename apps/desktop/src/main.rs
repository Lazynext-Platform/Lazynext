use gpui::*;
use gpui::prelude::*;
use lazynext_core::NLEState;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Save project state to a `.lazynext` JSON file via native file dialog.
fn save_project(nle: &Arc<Mutex<NLEState>>, rt: &tokio::runtime::Handle) {
    let dialog = rfd::FileDialog::new()
        .set_title("Save Lazynext Project")
        .add_filter("Lazynext Project", &["lazynext"])
        .set_file_name("Untitled.lazynext");
    if let Some(path) = dialog.save_file() {
        let pd = rt.block_on(async {
            let state = nle.lock().await;
            state.get_project_data().clone()
        });
        match serde_json::to_string_pretty(&pd) {
            Ok(json) => {
                if let Err(e) = std::fs::write(&path, json) {
                    log::error!("Failed to write project file: {e}");
                } else {
                    log::info!("Project saved to {}", path.display());
                }
            }
            Err(e) => log::error!("Failed to serialize project: {e}"),
        }
    }
}

/// Load project state from a `.lazynext` JSON file via native file dialog.
fn load_project(nle: &Arc<Mutex<NLEState>>, rt: &tokio::runtime::Handle) {
    let dialog = rfd::FileDialog::new()
        .set_title("Open Lazynext Project")
        .add_filter("Lazynext Project", &["lazynext"]);
    if let Some(path) = dialog.pick_file() {
        match std::fs::read_to_string(&path) {
            Ok(json) => {
                match serde_json::from_str::<lazynext_core::nle_state::ProjectData>(&json) {
                    Ok(pd) => {
                        rt.block_on(async {
                            let mut state = nle.lock().await;
                            state.load_project_data(pd);
                        });
                        log::info!("Project loaded from {}", path.display());
                    }
                    Err(e) => log::error!("Failed to deserialize project: {e}"),
                }
            }
            Err(e) => log::error!("Failed to read project file: {e}"),
        }
    }
}

struct EditorShell {
    nle: Arc<Mutex<NLEState>>,
    engine: Arc<Mutex<lazynext_core::engine::CoreEngine>>,
    rt_handle: tokio::runtime::Handle,
    last_frame_data: Option<gpui::ImageSource>,
    current_frame: u32,
}

impl Render for EditorShell {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let bg_color = rgb(0x121212); // Deep dark gray/black background
        let panel_bg = rgb(0x1e1e1e);
        let border_color = rgb(0x2a2a2a);
        let accent_color = rgb(0x00d4df); // Cyan
        
        // Fetch dynamic project data from NLE state and render frame
        let (pd, frame_data) = self.rt_handle.block_on(async {
            let nle_guard = self.nle.lock().await;
            let pd = nle_guard.get_project_data().clone();
            
            let mut engine = self.engine.lock().await;
            let frame = engine.render_frame(self.current_frame).await;
            (pd, frame.ok())
        });

        if let Some(rgba) = frame_data {
            let image_buffer = image::RgbaImage::from_raw(800, 450, rgba).unwrap();
            let frame = image::Frame::new(image_buffer);
            let render_image = gpui::RenderImage::new(vec![frame]);
            self.last_frame_data = Some(gpui::ImageSource::Render(Arc::new(render_image)));
        }

        // Helper for left toolbar icons
        let toolbar_icon = |label: &str| {
            div()
                .w(px(48.0))
                .h(px(48.0))
                .flex()
                .justify_center()
                .items_center()
                .rounded_lg()
                .hover(|s| s.bg(rgb(0x2a2a2a)))
                .child(label.to_string())
        };

        div()
            .flex()
            .flex_col()
            .bg(bg_color)
            .size_full()
            .font_family("Inter")
            .text_color(rgb(0xffffff))
            // Header
            .child(
                div()
                    .h(px(60.0))
                    .flex()
                    .items_center()
                    .justify_between()
                    .px_6()
                    .border_b_1()
                    .border_color(border_color)
                    .bg(panel_bg)
                    .child(
                        div().text_xl().font_weight(FontWeight::BOLD).text_color(accent_color).child("Lazynext Desktop")
                    )
                    .child({
                        let nle_load = self.nle.clone();
                        let nle_save = self.nle.clone();
                        let rt_load = self.rt_handle.clone();
                        let rt_save = self.rt_handle.clone();
                        div().flex().gap_4()
                            .child(
                                div().id("btn-load").p_2().bg(rgb(0x333333)).rounded_md().cursor_pointer().hover(|s| s.bg(rgb(0x444444)))
                                    .on_mouse_down(gpui::MouseButton::Left, move |_, _, _| {
                                        load_project(&nle_load, &rt_load);
                                    })
                                    .child("Load Project")
                            )
                            .child(
                                div().id("btn-save").p_2().bg(accent_color).text_color(rgb(0x000000)).rounded_md().cursor_pointer().hover(|s| s.bg(rgb(0x00e5f0)))
                                    .on_mouse_down(gpui::MouseButton::Left, move |_, _, _| {
                                        save_project(&nle_save, &rt_save);
                                    })
                                    .child("Save Project")
                            )
                    })
            )
            // Main workspace
            .child(
                div()
                    .flex_1()
                    .flex()
                    .flex_row()
                    .id("workspace")
                    .on_mouse_down(gpui::MouseButton::Left, |_, _, _| {
                        println!("[GPUI Input] Mouse Left Click inside Workspace!");
                    })
                    .on_drop({
                        let nle = self.nle.clone();
                        let rt = self.rt_handle.clone();
                        move |event: &gpui::ExternalPaths, _window, _cx| {
                            let paths = event.paths().to_vec();
                            rt.block_on(async {
                                let mut state = nle.lock().await;
                                for path in paths {
                                    let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                                    let full_path = path.to_string_lossy().to_string();
                                    
                                    // Naive inference of kind based on extension
                                    let kind = if filename.to_lowercase().ends_with(".mp4") || filename.to_lowercase().ends_with(".mov") {
                                        "video"
                                    } else if filename.to_lowercase().ends_with(".mp3") || filename.to_lowercase().ends_with(".wav") {
                                        "audio"
                                    } else {
                                        "video" // default
                                    };

                                    let uuid = uuid::Uuid::new_v4().to_string();
                                    let mut pd = state.get_project_data().clone();
                                    pd.media_pool.insert(uuid.clone(), lazynext_core::nle_state::MediaAsset {
                                        id: uuid.clone(),
                                        name: filename,
                                        path_or_url: full_path,
                                        asset_type: kind.to_string(),
                                        duration: 300.0,
                                        width: 1920,
                                        height: 1080,
                                    });
                                    state.load_project_data(pd);
                                }
                            });
                            log::info!("Ingested {} files via drag-and-drop", event.paths().len());
                        }
                    })
                    // Left Toolbar
                    .child(
                        div()
                            .w(px(64.0))
                            .flex()
                            .flex_col()
                            .items_center()
                            .py_6()
                            .gap_4()
                            .border_r_1()
                            .border_color(border_color)
                            .bg(panel_bg)
                            .child(toolbar_icon("B")) // Bin
                            .child(toolbar_icon("S")) // Scissors
                            .child(toolbar_icon("T")) // Type
                    )
                    // Media Bin Panel
                    .child(
                        div()
                            .w(px(256.0))
                            .flex()
                            .flex_col()
                            .border_r_1()
                            .border_color(border_color)
                            .bg(panel_bg)
                            .child(
                                div().p_4().border_b_1().border_color(border_color).child("Media Bin (Drop Files Here)")
                            )
                            .child(
                                div().p_4().flex().flex_col().gap_2()
                                    .children(pd.media_pool.values().map(|asset| {
                                        div().p_2().bg(rgb(0x2a2a2a)).rounded_md()
                                            .border_1().border_color(if asset.asset_type == "audio" { rgb(0x00ffaa) } else { accent_color })
                                            .child(asset.name.clone())
                                    }))
                            )
                    )
                    // Viewport & Timeline area
                    .child(
                        div()
                            .flex_1()
                            .flex()
                            .flex_col()
                            // Top Viewport
                            .child(
                                div()
                                    .flex_1()
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .bg(rgb(0x0a0a0a))
                                    .child(
                                        div()
                                            .w(px(800.0))
                                            .h(px(450.0))
                                            .bg(rgb(0x1a1a1a))
                                            .border_1()
                                            .border_color(border_color)
                                            .rounded_lg()
                                            .flex()
                                            .justify_center()
                                            .children(self.last_frame_data.as_ref().map(|src| {
                                                img(src.clone()).w_full().h_full().object_fit(gpui::ObjectFit::Contain)
                                            }))
                                            .child(
                                                // Fallback text if no frame is rendered
                                                div().text_sm().text_color(rgb(0x555555)).child("WebGPU Render Target Placeholder").when(self.last_frame_data.is_none(), |s| s.visible())
                                            )
                                    )
                            )
                            // AI Prompt Input Area
                            .child(
                                div()
                                    .h(px(56.0))
                                    .bg(rgb(0x1a1a1a))
                                    .border_t_1()
                                    .border_b_1()
                                    .border_color(border_color)
                                    .flex()
                                    .items_center()
                                    .px_4()
                                    .gap_4()
                                    .child(
                                        div()
                                            .flex_1()
                                            .h(px(36.0))
                                            .bg(rgb(0x0f0f0f))
                                            .border_1()
                                            .border_color(rgb(0x333333))
                                            .rounded_lg()
                                            .px_3()
                                            .flex()
                                            .items_center()
                                            .text_sm()
                                            .text_color(rgb(0x888888))
                                            .child("Ask AI to edit... (e.g. 'remove silence', 'add cinematic LUT')")
                                    )
                                    .child(
                                        div()
                                            .px_4()
                                            .py_1_5()
                                            .bg(accent_color)
                                            .text_color(rgb(0x000000))
                                            .rounded_md()
                                            .cursor_pointer()
                                            .child("Generate")
                                    )
                            )
                            // Timeline
                            .child(
                                div()
                                    .h(px(256.0))
                                    .flex()
                                    .flex_col()
                                    .border_t_1()
                                    .border_color(border_color)
                                    .bg(panel_bg)
                                    // Toolbar and Ruler
                                    .child(
                                        div().flex().items_center().border_b_1().border_color(border_color).bg(rgb(0x161616))
                                            .child(div().w(px(200.0)).p_2().border_r_1().border_color(border_color).child("Sequence 01"))
                                            .child(
                                                div().flex_1().relative().h(px(32.0))
                                                    // Time markings
                                                    .children((0..10).map(|i| {
                                                        div().absolute().top_0().bottom_0().w(px(1.0)).bg(rgb(0x333333))
                                                            .left(px((i * 100) as f32))
                                                            .child(div().absolute().top(px(4.0)).left(px(4.0)).text_color(rgb(0x666666)).text_xs().child(format!("00:00:{:02}", i * 4)))
                                                    }))
                                            )
                                    )
                                    // Tracks Area
                                    .child(
                                        div().flex_1().flex().flex_col().overflow_y_hidden()
                                            .children(pd.tracks.iter().map(|track| {
                                                let track_color = if track.kind == "audio" { rgb(0x005544) } else { rgb(0x007788) };
                                                let track_border = if track.kind == "audio" { rgb(0x00ffaa) } else { accent_color };
                                                
                                                div().h(px(48.0)).flex().items_center().border_b_1().border_color(rgb(0x222222))
                                                    // Track Header
                                                    .child(div().w(px(200.0)).h_full().p_2().flex().items_center().gap_2().bg(rgb(0x1a1a1a)).border_r_1().border_color(border_color)
                                                        .child(div().text_color(rgb(0x888888)).font_weight(FontWeight::BOLD).child(track.kind.to_uppercase()))
                                                        .child(div().text_color(rgb(0xaaaaaa)).child(track.id.clone()))
                                                    )
                                                    // Track Timeline
                                                    .child(
                                                        div().flex_1().h_full().bg(rgb(0x111111)).relative()
                                                            .children(track.clips.iter().map(|clip| {
                                                                div().absolute().top(px(4.0)).bottom(px(4.0))
                                                                    .left(px((clip.start as f32) * 2.0))
                                                                    .w(px(((clip.end - clip.start) as f32) * 2.0))
                                                                    .bg(track_color)
                                                                    .border_1().border_color(track_border).rounded_md().p_1().overflow_hidden()
                                                                    .child(div().text_xs().text_color(rgb(0xffffff)).child(clip.name.clone()))
                                                            }))
                                                    )
                                            }))
                                    )
                                    // Playhead Line Overlay
                                    .child(
                                        div().absolute().top_0().bottom_0().w(px(2.0)).bg(rgb(0xff0044))
                                            .left(px(200.0 + (self.current_frame as f32) * 2.0))
                                            // Playhead triangle
                                            .child(
                                                div().absolute().top(px(-4.0)).left(px(-4.0)).w(px(10.0)).h(px(8.0)).bg(rgb(0xff0044)).rounded_sm()
                                            )
                                    )
                            )
                    )
                    // Inspector Panel (Right)
                    .child(
                        div()
                            .w(px(300.0))
                            .flex()
                            .flex_col()
                            .border_l_1()
                            .border_color(border_color)
                            .bg(panel_bg)
                            .child(
                                div().p_4().border_b_1().border_color(border_color).child("Inspector")
                            )
                            .child(
                                div().p_4().flex().flex_col().gap_4()
                                    .child(
                                        div().flex().flex_col().gap_1()
                                            .child(div().text_sm().text_color(rgb(0x888888)).child("Transform"))
                                            .child(div().p_2().bg(rgb(0x1a1a1a)).border_1().border_color(rgb(0x333333)).rounded_md().child("Scale: 100%"))
                                            .child(div().p_2().bg(rgb(0x1a1a1a)).border_1().border_color(rgb(0x333333)).rounded_md().child("Position: X:0 Y:0"))
                                    )
                                    .child(
                                        div().flex().flex_col().gap_1()
                                            .child(div().text_sm().text_color(rgb(0x888888)).child("Opacity"))
                                            .child(div().p_2().bg(rgb(0x1a1a1a)).border_1().border_color(rgb(0x333333)).rounded_md().child("100%"))
                                    )
                            )
                    )
            )
    }
}

// GPUI takes over the main thread, so we run a standard main function.
fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    log::info!("🎬 Lazynext Desktop starting...");

    // We can run async code inside GPUI, but we'll instantiate our NLEState here.
    // NLEState currently needs an async context to lock. Wait, if we use a standard main, we don't have a tokio runtime.
    // We can create a tokio runtime manually.
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
        lazynext_core::engine::CoreEngine::init(nle.clone()).await.unwrap()
    })));

    log::info!("Entering native event loop...");
    let nle_clone = nle.clone();
    let engine_clone = engine.clone();
    
    Application::new().run(move |cx: &mut App| {
        let bounds = Bounds {
            origin: point(px(0.0), px(0.0)),
            size: size(px(1920.0), px(1080.0))
        };
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some("Lazynext Desktop — AI Video Editor".into()),
                    appears_transparent: true,
                    traffic_light_position: None,
                }),
                ..Default::default()
            },
            |_, cx| {
                cx.new(|_cx| EditorShell {
                    nle: nle_clone.clone(),
                    engine: engine_clone.clone(),
                    rt_handle: rt.handle().clone(),
                    last_frame_data: None,
                    current_frame: 0,
                })
            }
        );
    });
}
