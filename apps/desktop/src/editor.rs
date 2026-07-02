use gpui::prelude::*;
use gpui::*;
use lazynext_core::NLEState;
use lazynext_core::engine::AssetLoader;
use lazynext_core::ffmpeg_loader::CliFfmpegLoader;
use std::cell::Cell;
use std::rc::Rc;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct EditorShell {
    pub nle: Arc<Mutex<NLEState>>,
    pub engine: Arc<Mutex<lazynext_core::engine::CoreEngine>>,
    pub rt_handle: tokio::runtime::Handle,
    pub last_frame_data: Option<gpui::ImageSource>,
    pub current_frame: u32,
    pub is_playing: bool,
    pub ai_prompt_text: String,
    pub play_clicked: Rc<Cell<bool>>,
    pub prompt_focused: Rc<Cell<bool>>,
    pub prompt_clicked: Rc<Cell<bool>>,
}

impl EditorShell {
    fn toggle_playback(&mut self) {
        self.is_playing = !self.is_playing;
    }

    /// Timeline constants — zoomed so the visible range covers ~10 seconds at 24 fps.
    const TIMELINE_PX_PER_FRAME: f32 = 1.5;
    const _TIMELINE_LEFT_MARGIN: f32 = 100.0; // reserved for future ruler
}

impl Render for EditorShell {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        // Process pending play/pause click
        if self.play_clicked.get() {
            self.play_clicked.set(false);
            self.toggle_playback();
        }

        if self.is_playing {
            self.current_frame = self.current_frame.wrapping_add(1);
            cx.notify();
        }

        // Process pending prompt click (focus toggle)
        if self.prompt_clicked.get() {
            self.prompt_clicked.set(false);
            self.prompt_focused.set(true);
        }

        let bg_color = rgb(0x121212); // Deep dark gray/black background
        let panel_bg = rgb(0x1e1e1e);
        let border_color = rgb(0x2a2a2a);
        let accent_color = rgb(0x00d4df); // Cyan

        // Fetch dynamic project data from NLE state and render frame
        let (pd, frame_data) = self.rt_handle.block_on(async {
            let nle_guard = self.nle.lock().await;
            let pd = nle_guard.get_project_data().clone();

            let engine = self.engine.lock().await;
            // Auto-upload video textures from media_pool on first render
            for track in &pd.tracks {
                for clip in &track.clips {
                    if let Some(media_id) = &clip.media_id {
                        if let Some(asset) = pd.media_pool.get(media_id) {
                            let path = &asset.path_or_url;
                            let is_video = ["mp4", "mov", "mkv", "avi", "webm"]
                                .iter()
                                .any(|e| path.to_lowercase().ends_with(e));
                            if is_video {
                                let loader = CliFfmpegLoader::new(pd.width, pd.height);
                                if let Ok(rgba) = loader.load_frame(path, 0).await {
                                    let _ = engine
                                        .upload_texture(&clip.id, &rgba, pd.width, pd.height)
                                        .await;
                                }
                            }
                        }
                    }
                }
            }
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

        let play_clicked = self.play_clicked.clone();
        let prompt_clicked = self.prompt_clicked.clone();
        let is_prompt_focused = self.prompt_focused.get();
        let prompt_display = SharedString::from(self.ai_prompt_text.clone());
        let prompt_placeholder =
            SharedString::from("Click to focus and type a command (e.g. 'cut silences')");
        let prompt_text_color = if self.ai_prompt_text.is_empty() {
            rgb(0x666666)
        } else {
            rgb(0xcccccc)
        };
        let actual_text = if self.ai_prompt_text.is_empty() {
            prompt_placeholder
        } else {
            prompt_display
        };

        div()
            .flex()
            .w_full()
            .h_full()
            .bg(bg_color)
            .text_color(rgb(0xffffff))
            .child(
                // Left Toolbar
                div()
                    .w(px(64.0))
                    .flex()
                    .flex_col()
                    .items_center()
                    .py_4()
                    .gap_4()
                    .border_r_1()
                    .border_color(border_color)
                    .bg(panel_bg)
                    .child(toolbar_icon("S")) // Select
                    .child(toolbar_icon("T")) // Text
                    .child(toolbar_icon("B")) // Blade
                    .child(toolbar_icon("P")), // Pen (Masks)
            )
            .child(
                // Main Workspace
                div()
                    .flex_1()
                    .flex()
                    .flex_col()
                    .child(
                        // Top Area (Preview + Media)
                        div()
                            .flex_1()
                            .flex()
                            .child(
                                // Media Bin
                                div()
                                    .w(px(250.0))
                                    .flex()
                                    .flex_col()
                                    .border_r_1()
                                    .border_color(border_color)
                                    .bg(panel_bg)
                                    .child(
                                        div()
                                            .p_4()
                                            .border_b_1()
                                            .border_color(border_color)
                                            .flex()
                                            .justify_between()
                                            .child("Project Media")
                                            .child(
                                                div()
                                                    .px_2()
                                                    .py_1()
                                                    .bg(accent_color)
                                                    .text_color(rgb(0x000000))
                                                    .rounded_sm()
                                                    .cursor_pointer()
                                                    .text_sm()
                                                    .hover(|s| s.bg(rgb(0x00b4bf)))
                                                    .child("+ Import")
                                                    .on_mouse_down(gpui::MouseButton::Left, {
                                                        let nle = self.nle.clone();
                                                        move |_, _, cx| {
                                                            let nle = nle.clone();
                                                            let window = cx;
                                                            tokio::spawn(async move {
                                                                let file = rfd::AsyncFileDialog::new()
                                                                    .add_filter("Media", &["mp4", "mov", "avi", "mkv", "wav", "mp3"])
                                                                    .pick_file()
                                                                    .await;
                                                                if let Some(file) = file {
                                                                    let path = file.path().to_string_lossy().to_string();
                                                                    log::info!("Importing media: {}", path);
                                                                    let clip_name = std::path::Path::new(&path)
                                                                        .file_stem()
                                                                        .map(|s| s.to_string_lossy().to_string())
                                                                        .unwrap_or_else(|| "imported".to_string());
                                                                    let mut nle_guard = nle.lock().await;
                                                                    nle_guard.add_media_asset(
                                                                        lazynext_core::nle_state::MediaAsset {
                                                                            id: format!("media_{}", uuid::Uuid::new_v4()),
                                                                            name: clip_name.clone(),
                                                                            path_or_url: path,
                                                                            asset_type: "video".to_string(),
                                                                            duration: 10.0,
                                                                            width: 1920,
                                                                            height: 1080,
                                                                        },
                                                                    );
                                                                    nle_guard.add_clip_to_track(
                                                                        0,
                                                                        format!("clip_{}", uuid::Uuid::new_v4()),
                                                                        "video".to_string(),
                                                                        clip_name.clone(),
                                                                        0,
                                                                        240,
                                                                    );
                                                                    log::info!("Media imported: {}", clip_name);
                                                                }
                                                            });
                                                        }
                                                    }),
                                            ),
                                    ),
                            )
                            .child(
                                // Canvas/Preview
                                div()
                                    .flex_1()
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .bg(rgb(0x0a0a0a))
                                    .child(
                                        div()
                                            .w(px(800.0))
                                            .h(px(450.0))
                                            .bg(rgb(0x000000))
                                            .border_1()
                                            .border_color(rgb(0x333333))
                                            .shadow_md()
                                            .map(|el| {
                                                if let Some(img_source) = &self.last_frame_data {
                                                    el.child(
                                                        img(img_source.clone()).w_full().h_full(),
                                                    )
                                                } else {
                                                    el.child(
                                                        div()
                                                            .flex()
                                                            .w_full()
                                                            .h_full()
                                                            .justify_center()
                                                            .items_center()
                                                            .child("No Frame Rendered"),
                                                    )
                                                }
                                            }),
                                    ),
                            ),
                    )
                    .child(
                        // Playback Transport Bar
                        div()
                            .h(px(36.0))
                            .flex()
                            .items_center()
                            .gap_2()
                            .px_3()
                            .bg(rgb(0x1a1a1a))
                            .border_b_1()
                            .border_color(border_color)
                            .child(
                                div()
                                    .w(px(32.0))
                                    .h(px(28.0))
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .rounded_sm()
                                    .bg(if self.is_playing { accent_color } else { rgb(0x333333) })
                                    .cursor_pointer()
                                    .hover(|s| s.bg(if self.is_playing { rgb(0x00b4bf) } else { rgb(0x444444) }))
                                    .child(if self.is_playing { "⏸" } else { "▶" })
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let play_clicked = play_clicked.clone();
                                        move |_, _, _| {
                                            play_clicked.set(true);
                                        }
                                    }),
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(rgb(0x888888))
                                    .child(format!("Frame {}", self.current_frame)),
                            )
                            .child(div().flex_1())
                            .child(
                                div()
                                    .px_3()
                                    .py_1()
                                    .bg(accent_color)
                                    .text_color(rgb(0x000000))
                                    .rounded_md()
                                    .cursor_pointer()
                                    .text_sm()
                                    .hover(|s| s.bg(rgb(0x00b4bf)))
                                    .child("Export MP4")
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let engine = self.engine.clone();
                                        move |_, _, _cx| {
                                            let engine = engine.clone();
                                            tokio::spawn(async move {
                                                let file = rfd::AsyncFileDialog::new()
                                                    .add_filter("MP4 Video", &["mp4"])
                                                    .set_file_name("export.mp4")
                                                    .save_file()
                                                    .await;
                                                if let Some(file) = file {
                                                    let path = file.path().to_string_lossy().to_string();
                                                    log::info!("Exporting to: {}", path);
                                                    let engine_guard = engine.lock().await;
                                                    match engine_guard.dispatch_export(
                                                        &path,
                                                        lazynext_export::ExportFormat::Mp4,
                                                        5000,
                                                        240,
                                                        None,
                                                    ).await {
                                                        Ok(_) => log::info!("Export complete: {}", path),
                                                        Err(e) => log::error!("Export failed: {}", e),
                                                    }
                                                }
                                            });
                                        }
                                    }),
                            ),
                    )
                    .child(
                        // Timeline Area (Bottom)
                        div()
                            .h(px(300.0))
                            .flex()
                            .flex_col()
                            .border_t_1()
                            .border_color(border_color)
                            .bg(panel_bg)
                            .child(
                                div()
                                    .p_2()
                                    .flex()
                                    .justify_between()
                                    .border_b_1()
                                    .border_color(border_color)
                                    .child(div().child("Timeline"))
                                    .child(div().child(format!("Frame: {}", self.current_frame))),
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .relative()
                                    .overflow_hidden()
                                    .p_4()
                                    .flex()
                                    .flex_col()
                                    .gap_2()
                                    .children(pd.tracks.iter().map(|track| {
                                        div()
                                            .flex()
                                            .w_full()
                                            .h(px(40.0))
                                            .child(
                                                div()
                                                    .w(px(100.0))
                                                    .flex()
                                                    .items_center()
                                                    .text_sm()
                                                    .child(track.id.clone()),
                                            )
                                            .child(
                                                div()
                                                    .flex_1()
                                                    .bg(rgb(0x2a2a2a))
                                                    .rounded_md()
                                                    .relative()
                                                    .children(
                                                        track.clips.iter().map(|clip| {
                                                            let left_px =
                                                                clip.start as f32 * Self::TIMELINE_PX_PER_FRAME;
                                                            let width_px =
                                                                (clip.end.saturating_sub(clip.start)) as f32
                                                                    * Self::TIMELINE_PX_PER_FRAME;
        div()
                                                                .absolute()
                                                                .top_0()
                                                                .bottom_0()
                                                                .left(px(left_px))
                                                                .w(px(width_px.max(8.0)))
                                                                .bg(accent_color)
                                                                .rounded_md()
                                                                .opacity(0.8)
                                                                .flex()
                                                                .items_center()
                                                                .justify_center()
                                                                .text_color(rgb(0x000000))
                                                                .text_sm()
                                                                .child(clip.name.clone())
                                                        }),
                                                    ),
                                            )
                                    }))
                                    .child(
                                        div()
                                            .absolute()
                                            .top_0()
                                            .bottom_0()
                                            .w(px(2.0))
                                            .bg(rgb(0xff0044))
                                            .left(px(self.current_frame as f32 * Self::TIMELINE_PX_PER_FRAME))
                                            // Playhead triangle
                                            .child(
                                                div()
                                                    .absolute()
                                                    .top(px(-4.0))
                                                    .left(px(-4.0))
                                                    .w(px(10.0))
                                                    .h(px(8.0))
                                                    .bg(rgb(0xff0044))
                                                    .rounded_sm(),
                                            ),
                                    ),
                            ),
                    ),
            )
            .child(
                // Inspector Panel (Right)
                div()
                    .w(px(300.0))
                    .flex()
                    .flex_col()
                    .border_l_1()
                    .border_color(border_color)
                    .bg(panel_bg)
                    .child(
                        div()
                            .p_4()
                            .border_b_1()
                            .border_color(border_color)
                            .child("Inspector"),
                    )
                    .child(
                        div()
                            .p_4()
                            .flex()
                            .flex_col()
                            .gap_4()
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap_1()
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(rgb(0x888888))
                                            .child("Transform"),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(rgb(0x1a1a1a))
                                            .border_1()
                                            .border_color(rgb(0x333333))
                                            .rounded_md()
                                            .child("Scale: 100%"),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(rgb(0x1a1a1a))
                                            .border_1()
                                            .border_color(rgb(0x333333))
                                            .rounded_md()
                                            .child("Position: X:0 Y:0"),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap_1()
                                    .child(
                                        div().text_sm().text_color(rgb(0x888888)).child("Opacity"),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(rgb(0x1a1a1a))
                                            .border_1()
                                            .border_color(rgb(0x333333))
                                            .rounded_md()
                                            .child("100%"),
                                    ),
                            )
                            // --- AI PROMPT BAR (with real text input) ---
                            .child(
                                div()
                                    .mt_8()
                                    .flex()
                                    .flex_col()
                                    .gap_2()
                                    .child(
                                        div()
                                            .text_sm()
                                            .font_weight(FontWeight::BOLD)
                                            .text_color(accent_color)
                                            .child("AI Copilot"),
                                    )
                                    .child(
                                        // Clickable prompt display area — shows current prompt text
                                        div()
                                            .p_3()
                                            .bg(rgb(0x0a0a0a))
                                            .border_1()
                                            .border_color(if is_prompt_focused { rgb(0x00ff88) } else { accent_color })
                                            .rounded_md()
                                            .cursor_pointer()
                                            .child(
                                                div()
                                                    .text_sm()
                                                    .text_color(prompt_text_color)
                                                    .child(actual_text.clone()),
                                            )
                                            .on_mouse_down(gpui::MouseButton::Left, {
                                                let prompt_clicked = prompt_clicked.clone();
                                                move |_, _, _| {
                                                    prompt_clicked.set(true);
                                                }
                                            }),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(accent_color)
                                            .text_color(rgb(0x000000))
                                            .rounded_md()
                                            .cursor_pointer()
                                            .flex()
                                            .justify_center()
                                            .hover(|s| s.bg(rgb(0x00b4bf)))
                                            .child("Run Command")
                                            .on_mouse_down(gpui::MouseButton::Left, {
                                                let text = self.ai_prompt_text.clone();
                                                let prompt_focused = self.prompt_focused.clone();
                                                move |_, _, _cx| {
                                                    prompt_focused.set(false);
                                                    let prompt = if text.is_empty() {
                                                        "Apply cinematic color grade and remove silences".to_string()
                                                    } else {
                                                        text.clone()
                                                    };
                                                    log::info!("AI Command triggered: {}", prompt);
                                                    let gateway = std::env::var("RUST_API_GATEWAY_URL")
                                                        .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                                                    tokio::spawn(async move {
                                                        let client = reqwest::Client::new();
                                                        match client
                                                            .post(format!("{}/api/v1/autonomous_edit", gateway))
                                                            .json(&serde_json::json!({
                                                                "prompt": prompt,
                                                                "require_plan_approval": false,
                                                            }))
                                                            .send()
                                                            .await
                                                        {
                                                            Ok(resp) => {
                                                                if resp.status().is_success() {
                                                                    log::info!("AI command executed successfully via API gateway");
                                                                } else {
                                                                    log::warn!("API gateway returned: {}", resp.status());
                                                                }
                                                            }
                                                            Err(e) => {
                                                                log::warn!("API gateway unreachable: {}. Start gateway on port 8005.", e);
                                                            }
                                                        }
                                                    });
                                                }
                                            }),
                                    ),
                            ), // -------------------------
                    ),
            )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lazynext_core::NLEState;
    use lazynext_core::engine::CoreEngine;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[tokio::test]
    async fn test_editor_shell_creation() {
        let nle = Arc::new(Mutex::new(NLEState::new(
            "test_editor".to_string(),
            "Test".to_string(),
            24,
        )));

        let rt_handle = tokio::runtime::Handle::current();
        let engine = Arc::new(Mutex::new(CoreEngine::init(nle.clone()).await.unwrap()));

        let editor = EditorShell {
            nle,
            engine,
            rt_handle,
            last_frame_data: None,
            current_frame: 0,
            is_playing: false,
            ai_prompt_text: String::new(),
            play_clicked: Rc::new(Cell::new(false)),
            prompt_focused: Rc::new(Cell::new(false)),
            prompt_clicked: Rc::new(Cell::new(false)),
        };

        assert!(!editor.is_playing);
        assert_eq!(editor.current_frame, 0);
        assert!(editor.last_frame_data.is_none());
    }

    #[tokio::test]
    async fn test_editor_playback_toggle() {
        let nle = Arc::new(Mutex::new(NLEState::new(
            "test_play".to_string(),
            "Test Play".to_string(),
            24,
        )));

        let rt_handle = tokio::runtime::Handle::current();
        let engine = Arc::new(Mutex::new(CoreEngine::init(nle.clone()).await.unwrap()));

        let mut editor = EditorShell {
            nle,
            engine,
            rt_handle,
            last_frame_data: None,
            current_frame: 0,
            is_playing: false,
            ai_prompt_text: String::new(),
            play_clicked: Rc::new(Cell::new(false)),
            prompt_focused: Rc::new(Cell::new(false)),
            prompt_clicked: Rc::new(Cell::new(false)),
        };

        assert!(!editor.is_playing);
        editor.toggle_playback();
        assert!(editor.is_playing);
        editor.toggle_playback();
        assert!(!editor.is_playing);
    }
}
