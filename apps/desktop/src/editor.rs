//! Full editor shell for the GPUI desktop app.
//!
//! Wires up the compositor viewport, timeline, AI prompt bar, import
//! button, and export flow.  Delegates all editing logic to CoreEngine
//! and renders frames via the GPU compositor texture store.

use crate::auth::load_auth_token;
use gpui::prelude::*;
use gpui::*;
use lazynext_core::NLEState;
use lazynext_core::engine::AssetLoader;
use lazynext_core::ffmpeg_loader::CliFfmpegLoader;
use lazynext_core::ring_buffer_decoder::RingBufferDecoder;
use std::cell::Cell;
use std::rc::Rc;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Instant;
use tokio::sync::Mutex;

/// A single AI agent edit suggestion presented in the inspector panel.
#[derive(Clone)]
pub struct AgentSuggestion {
    /// Unique identifier of the suggestion.
    #[allow(dead_code)]
    pub id: String,
    /// Short human-readable title of the suggested edit.
    pub title: String,
    /// Longer description of what the suggestion does.
    pub description: String,
}

/// Root editor UI state: viewport, timeline, transport, and AI agent widgets.
pub struct EditorShell {
    /// Shared CRDT NLE state for the project.
    pub nle: Arc<Mutex<NLEState>>,
    /// Core rendering/editing engine.
    pub engine: Arc<Mutex<lazynext_core::engine::CoreEngine>>,
    /// Tokio runtime handle for blocking async work during render.
    pub rt_handle: tokio::runtime::Handle,
    /// Last rendered frame, cached for display.
    pub last_frame_data: Option<gpui::ImageSource>,
    /// Current playhead frame index.
    pub current_frame: u32,
    /// Whether playback is active.
    pub is_playing: bool,
    /// Current AI prompt text buffer.
    pub ai_prompt_text: String,
    /// Flag set when the play button is clicked.
    pub play_clicked: Rc<Cell<bool>>,
    /// Whether the prompt input is focused.
    pub prompt_focused: Rc<Cell<bool>>,
    /// Flag set when the prompt area is clicked.
    pub prompt_clicked: Rc<Cell<bool>>,
    /// Whether the autonomous agent is active.
    pub agent_active: Rc<Cell<bool>>,
    /// Current AI agent suggestions.
    pub agent_suggestions: Arc<tokio::sync::Mutex<Vec<AgentSuggestion>>>,
    /// Whether the suggestions panel is expanded.
    pub suggestions_expanded: bool,
    /// Flag set when the suggestions expand toggle is clicked.
    pub suggestions_expand_clicked: Rc<Cell<bool>>,
    /// Index of the currently selected suggestion, if any.
    pub selected_suggestion: Option<usize>,
    /// Flag set when a suggestion is clicked.
    pub suggestion_select_clicked: Rc<Cell<bool>>,
    /// Index of the suggestion pending selection.
    pub suggestion_select_idx: usize,
    /// Flag set when the step-back-5-frames button is clicked.
    pub frame_step_back5_clicked: Rc<Cell<bool>>,
    /// Flag set when the step-back-1-frame button is clicked.
    pub frame_step_back1_clicked: Rc<Cell<bool>>,
    /// Flag set when the step-forward-1-frame button is clicked.
    pub frame_step_fwd1_clicked: Rc<Cell<bool>>,
    /// Flag set when the step-forward-5-frames button is clicked.
    pub frame_step_fwd5_clicked: Rc<Cell<bool>>,
    /// Whether an export is currently in progress.
    pub exporting: Arc<AtomicBool>,
    /// Timestamp when the current export started, if any.
    pub export_start_time: Option<Instant>,
    /// Latest error message to display, if any.
    pub error_message: Option<String>,
    /// Whether the error banner is visible.
    pub show_error: bool,
}

impl EditorShell {
    // Toggle the play/pause state of the transport.
    fn toggle_playback(&mut self) {
        self.is_playing = !self.is_playing;
    }

    // Move the playhead by `delta` frames, clamping to frame zero.
    fn step_frame(&mut self, delta: i32) {
        let new_frame = self.current_frame as i32 + delta;
        self.current_frame = if new_frame < 0 { 0 } else { new_frame as u32 };
    }

    /// Timeline constants — zoomed so the visible range covers ~10 seconds at 24 fps.
    const TIMELINE_PX_PER_FRAME: f32 = 1.5;
    const _TIMELINE_LEFT_MARGIN: f32 = 100.0; // reserved for future ruler
}

impl Render for EditorShell {
    // Builds the editor view: viewport, timeline, transport, inspector, and AI widgets.
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

        // Process frame-step clicks
        if self.frame_step_back5_clicked.get() {
            self.frame_step_back5_clicked.set(false);
            self.step_frame(-5);
        }
        if self.frame_step_back1_clicked.get() {
            self.frame_step_back1_clicked.set(false);
            self.step_frame(-1);
        }
        if self.frame_step_fwd1_clicked.get() {
            self.frame_step_fwd1_clicked.set(false);
            self.step_frame(1);
        }
        if self.frame_step_fwd5_clicked.get() {
            self.frame_step_fwd5_clicked.set(false);
            self.step_frame(5);
        }

        // Process agent suggestions expand/collapse
        if self.suggestions_expand_clicked.get() {
            self.suggestions_expand_clicked.set(false);
            self.suggestions_expanded = !self.suggestions_expanded;
        }

        // Process suggestion selection
        if self.suggestion_select_clicked.get() {
            self.suggestion_select_clicked.set(false);
            let idx = self.suggestion_select_idx;
            self.selected_suggestion = if self.selected_suggestion == Some(idx) {
                None
            } else {
                Some(idx)
            };
        }

        // Export live-update
        if self.exporting.load(Ordering::SeqCst) {
            if self.export_start_time.is_none() {
                self.export_start_time = Some(Instant::now());
            }
            cx.notify();
        } else {
            self.export_start_time = None;
        }

        // Process pending prompt click (focus toggle)
        if self.prompt_clicked.get() {
            self.prompt_clicked.set(false);
            self.prompt_focused.set(true);
        }

        let theme = crate::theme::Theme::from_appearance(_window.appearance());
        let bg_color = theme.bg_main;
        let panel_bg = theme.bg_panel;
        let border_color = theme.border;
        let accent_color = theme.accent_primary;

        // Fetch dynamic project data from NLE state and render frame
        let (pd, frame_data) = self.rt_handle.block_on(async {
            let nle_guard = self.nle.lock().await;
            let pd = nle_guard.get_project_data().clone();

            let engine = self.engine.lock().await;
            // Auto-upload video textures from media_pool on first render
            for track in &pd.tracks {
                for clip in &track.clips {
                    if let Some(media_id) = &clip.media_id
                        && let Some(asset) = pd.media_pool.get(media_id)
                    {
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
            let frame = engine.render_frame(self.current_frame).await;
            (pd, frame.ok())
        });

        if let Some(rgba) = frame_data {
            let w = pd.width.max(1);
            let h = pd.height.max(1);
            if rgba.len() == (w as usize) * (h as usize) * 4 {
                if let Some(image_buffer) = image::RgbaImage::from_raw(w, h, rgba) {
                    let frame = image::Frame::new(image_buffer);
                    let render_image = gpui::RenderImage::new(vec![frame]);
                    self.last_frame_data = Some(gpui::ImageSource::Render(Arc::new(render_image)));
                }
            } else {
                log::warn!(
                    "Frame buffer size {} does not match project dimensions {}x{} ({} bytes expected)",
                    rgba.len(),
                    w,
                    h,
                    (w as usize) * (h as usize) * 4
                );
            }
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
                .hover(|s| s.bg(theme.border))
                .child(label.to_string())
        };

        let play_clicked = self.play_clicked.clone();
        let prompt_clicked = self.prompt_clicked.clone();
        let is_prompt_focused = self.prompt_focused.get();
        let prompt_display = SharedString::from(self.ai_prompt_text.clone());
        let prompt_placeholder =
            SharedString::from("Click to focus and type a command (e.g. 'cut silences')");
        let prompt_text_color = if self.ai_prompt_text.is_empty() {
            theme.text_muted
        } else {
            theme.text_secondary
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
            .text_color(theme.text_primary)
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
                                                    .text_color(theme.bg_main)
                                                    .rounded_sm()
                                                    .cursor_pointer()
                                                    .text_sm()
                                                    .hover(|s| s.bg(theme.accent_secondary))
                                                    .child("+ Import")
                                                    .on_mouse_down(gpui::MouseButton::Left, {
                                                        let nle = self.nle.clone();
                                                        let engine = self.engine.clone();
                                                        move |_, _, _cx| {
                                                            let nle = nle.clone();
                                                            let engine = engine.clone();
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
                                                                            path_or_url: path.clone(),
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
                                                                    drop(nle_guard);

                                                                    // Start ring buffer decoder for real-time playback
                                                                    let decoder = RingBufferDecoder::new(1920, 1080);
                                                                    let mut engine_guard = engine.lock().await;
                                                                    engine_guard.set_asset_loader(Arc::new(decoder));
                                                                    log::info!("Ring buffer decoder activated for: {}", path);
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
                                    .bg(theme.timeline_bg)
                                    .child(
                                        div()
                                            .w_full()
                                            .h_full()
                                            .bg(theme.bg_main)
                                            .border_1()
                                            .border_color(theme.bg_panel)
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
                            .gap_1()
                            .px_3()
                            .bg(theme.bg_panel)
                            .border_b_1()
                            .border_color(border_color)
                            .child(
                                div()
                                    .w(px(26.0))
                                    .h(px(26.0))
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .rounded_sm()
                                    .bg(theme.bg_panel)
                                    .cursor_pointer()
                                    .hover(|s| s.bg(theme.bg_hover))
                                    .child("⏮")
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let c = self.frame_step_back5_clicked.clone();
                                        move |_, _, _| c.set(true)
                                    }),
                            )
                            .child(
                                div()
                                    .w(px(26.0))
                                    .h(px(26.0))
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .rounded_sm()
                                    .bg(theme.bg_panel)
                                    .cursor_pointer()
                                    .hover(|s| s.bg(theme.bg_hover))
                                    .child("◀")
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let c = self.frame_step_back1_clicked.clone();
                                        move |_, _, _| c.set(true)
                                    }),
                            )
                            .child(
                                div()
                                    .w(px(32.0))
                                    .h(px(28.0))
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .rounded_sm()
                                    .bg(if self.is_playing { accent_color } else { theme.bg_panel })
                                    .cursor_pointer()
                                    .hover(|s| s.bg(if self.is_playing { theme.accent_secondary } else { theme.bg_hover }))
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
                                    .w(px(26.0))
                                    .h(px(26.0))
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .rounded_sm()
                                    .bg(theme.bg_panel)
                                    .cursor_pointer()
                                    .hover(|s| s.bg(theme.bg_hover))
                                    .child("▶")
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let c = self.frame_step_fwd1_clicked.clone();
                                        move |_, _, _| c.set(true)
                                    }),
                            )
                            .child(
                                div()
                                    .w(px(26.0))
                                    .h(px(26.0))
                                    .flex()
                                    .justify_center()
                                    .items_center()
                                    .rounded_sm()
                                    .bg(theme.bg_panel)
                                    .cursor_pointer()
                                    .hover(|s| s.bg(theme.bg_hover))
                                    .child("⏭")
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let c = self.frame_step_fwd5_clicked.clone();
                                        move |_, _, _| c.set(true)
                                    }),
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(theme.text_muted)
                                    .child(format!("Frame {}", self.current_frame)),
                            )
                            .child(div().flex_1())
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(theme.text_muted)
                                    .child("Space:Play/Pause  ←→:Step ±1  ⇧←→:Step ±5"),
                            )
                            .child(div().flex_1())
                            .child(
                                div()
                                    .px_3()
                                    .py_1()
                                    .bg(accent_color)
                                    .text_color(theme.bg_main)
                                    .rounded_md()
                                    .cursor_pointer()
                                    .text_sm()
                                    .hover(|s| s.bg(theme.accent_secondary))
                                    .child("Export MP4")
                                    .on_mouse_down(gpui::MouseButton::Left, {
                                        let engine = self.engine.clone();
                                        let exporting = self.exporting.clone();
                                        move |_, _, _cx| {
                                            let engine = engine.clone();
                                            let exporting = exporting.clone();
                                            exporting.store(true, Ordering::SeqCst);
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
                                                exporting.store(false, Ordering::SeqCst);
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
                                                    .bg(theme.border)
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
                                                                .text_color(theme.bg_main)
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
                                            .bg(theme.playhead)
                                            .left(px(self.current_frame as f32 * Self::TIMELINE_PX_PER_FRAME))
                                            // Playhead triangle
                                            .child(
                                                div()
                                                    .absolute()
                                                    .top(px(-4.0))
                                                    .left(px(-4.0))
                                                    .w(px(10.0))
                                                    .h(px(8.0))
                                                    .bg(theme.playhead)
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
                                            .text_color(theme.text_muted)
                                            .child("Transform"),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(theme.bg_panel)
                                            .border_1()
                                            .border_color(theme.bg_panel)
                                            .rounded_md()
                                            .child("Scale: 100%"),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(theme.bg_panel)
                                            .border_1()
                                            .border_color(theme.bg_panel)
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
                                        div().text_sm().text_color(theme.text_muted).child("Opacity"),
                                    )
                                    .child(
                                        div()
                                            .p_2()
                                            .bg(theme.bg_panel)
                                            .border_1()
                                            .border_color(theme.bg_panel)
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
                                            .child("Lazynext AI Agent"),
                                    )
                                    .child(
                                        // Clickable prompt display area — shows current prompt text
                                        div()
                                            .p_3()
                                            .bg(theme.timeline_bg)
                                            .border_1()
                                            .border_color(if is_prompt_focused { theme.accent_primary } else { accent_color })
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
                                            .text_color(theme.bg_main)
                                            .rounded_md()
                                            .cursor_pointer()
                                            .flex()
                                            .justify_center()
                                            .hover(|s| s.bg(theme.accent_secondary))
                                            .child("Run Command")
                                            .on_mouse_down(gpui::MouseButton::Left, {
                                                let text = self.ai_prompt_text.clone();
                                                let prompt_focused = self.prompt_focused.clone();
                                                move |_, _, _cx| {
                                                    prompt_focused.set(false);
                                                    let raw_prompt = if text.is_empty() {
                                                        "Apply cinematic color grade and remove silences".to_string()
                                                    } else {
                                                        text.clone()
                                                    };
                                                    // Validate and sanitize prompt before sending
                                                    let prompt = raw_prompt.trim().to_string();
                                                    if prompt.is_empty() {
                                                        log::warn!("AI Command rejected: empty prompt");
                                                        return;
                                                    }
                                                    if prompt.len() > 50000 {
                                                        log::warn!("AI Command rejected: prompt exceeds 50,000 characters");
                                                        return;
                                                    }
                                                    log::info!("AI Command triggered: {}", prompt);
                                                    let gateway = std::env::var("RUST_API_GATEWAY_URL")
                                                        .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                                                    tokio::spawn(async move {
                                                        let auth_header = load_auth_token();
                                                        let captcha_token = crate::captcha::perform_captcha(&gateway).await.ok();
                                                        let client = reqwest::Client::new();
                                                        let mut req = client
                                                            .post(format!("{}/api/v1/autonomous_edit", gateway))
                                                            .json(&serde_json::json!({
                                                                "prompt": prompt,
                                                                "require_plan_approval": false,
                                                            }));
                                                        if let Some(auth) = auth_header {
                                                            req = req.header("Authorization", auth);
                                                        }
                                                        if let Some(ref ct) = captcha_token {
                                                            req = req.header("X-Captcha-Token", ct);
                                                        }
                                                        match req.send().await
                                                        {
                                                            Ok(resp) => {
                                                                if resp.status().is_success() {
                                                                    log::info!("Lazynext AI Agent command executed successfully via API gateway");
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
                            ) // -------------------------
                            // --- AUTONOMOUS AGENT ---
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap_2()
                                    .child(
                                        div()
                                            .flex()
                                            .justify_between()
                                            .items_center()
                                            .child(
                                                div()
                                                    .text_sm()
                                                    .font_weight(FontWeight::BOLD)
                                                    .text_color(if self.agent_active.get() { theme.accent_primary } else { theme.playhead })
                                                    .child(if self.agent_active.get() { "Agent: Active" } else { "Agent: Stopped" }),
                                            )
                                            .child(
                                                div()
                                                    .px_2()
                                                    .py_1()
                                                    .rounded_sm()
                                                    .text_sm()
                                                    .cursor_pointer()
                                                    .bg(if self.agent_active.get() { theme.playhead } else { theme.accent_primary })
                                                    .text_color(theme.bg_main)
                                                    .hover(|s| s.opacity(0.8))
                                                    .child(if self.agent_active.get() { "Stop" } else { "Start" })
                                                    .on_mouse_down(gpui::MouseButton::Left, {
                                                        let agent_active = self.agent_active.clone();
                                                        let agent_suggestions = self.agent_suggestions.clone();
                                                        move |_, _, _| {
                                                            let currently = agent_active.get();
                                                            agent_active.set(!currently);
                                                            let suggestions = agent_suggestions.clone();
                                                            tokio::spawn(async move {
                                                                let gateway = std::env::var("RUST_API_GATEWAY_URL")
                                                                    .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                                                                let auth_header = load_auth_token();
                                                                let client = reqwest::Client::new();
                                                                if currently {
                                                                    let mut req = client
                                                                        .post(format!("{}/api/v1/agent/stop", gateway));
                                                                    if let Some(ref auth) = auth_header {
                                                                        req = req.header("Authorization", auth);
                                                                    }
                                                                    let _ = req.send().await;
                                                                    suggestions.lock().await.clear();
                                                                } else {
                                                                    let mut req = client
                                                                        .post(format!("{}/api/v1/agent/start", gateway));
                                                                    if let Some(ref auth) = auth_header {
                                                                        req = req.header("Authorization", auth);
                                                                    }
                                                                    let _ = req.send().await;
                                                                }
                                                            });
                                                        }
                                                    }),
                                            ),
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .justify_between()
                                            .items_center()
                                            .cursor_pointer()
                                            .on_mouse_down(gpui::MouseButton::Left, {
                                                let c = self.suggestions_expand_clicked.clone();
                                                move |_, _, _| c.set(true)
                                            })
                                            .child(
                                                div()
                                                    .text_sm()
                                                    .text_color(theme.text_muted)
                                                    .child("Suggestions ▼"),
                                            )
                                            .child(
                                                div()
                                                    .px_2()
                                                    .py_1()
                                                    .bg(theme.border)
                                                    .rounded_sm()
                                                    .text_xs()
                                                    .text_color(theme.text_muted)
                                                    .cursor_pointer()
                                                    .hover(|s| s.bg(theme.bg_hover))
                                                    .child("↻ Fetch")
                                                    .on_mouse_down(gpui::MouseButton::Left, {
                                                        let agent_suggestions = self.agent_suggestions.clone();
                                                        move |_, _, cx| {
                                                            cx.stop_propagation();
                                                            let suggestions = agent_suggestions.clone();
                                                            tokio::spawn(async move {
                                                                let gateway = std::env::var("RUST_API_GATEWAY_URL")
                                                                    .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                                                                let auth_header = load_auth_token();
                                                                let client = reqwest::Client::new();
                                                                let mut req = client
                                                                    .get(format!("{}/api/v1/agent/suggestions", gateway));
                                                                if let Some(ref auth) = auth_header {
                                                                    req = req.header("Authorization", auth);
                                                                }
                                                                if let Ok(resp) = req.send().await
                                                                    && let Ok(body) = resp.text().await
                                                                    && let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                                                                    let mut guard = suggestions.lock().await;
                                                                    guard.clear();
                                                                    if let Some(arr) = json["suggestions"].as_array() {
                                                                        for s in arr {
                                                                            guard.push(AgentSuggestion {
                                                                                id: s["id"].as_str().unwrap_or("").to_string(),
                                                                                title: s["title"].as_str().unwrap_or("").to_string(),
                                                                                description: s["description"].as_str().unwrap_or("").to_string(),
                                                                            });
                                                                        }
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }),
                                            ),
                                    )
                                    .when(self.suggestions_expanded, |parent| {
                                        let list = self.rt_handle.block_on(async {
                                            self.agent_suggestions.lock().await.clone()
                                        });
                                        parent.child(
                                            div()
                                                .flex()
                                                .flex_col()
                                                .gap_1()
                                                .max_h(px(200.0))
                                                .overflow_hidden()
                                                .children(list.iter().enumerate().map(|(i, s)| {
                                                    let is_sel = self.selected_suggestion == Some(i);
                                                    let title = s.title.clone();
                                                    let desc = s.description.clone();
                                                    let sugs = self.agent_suggestions.clone();
                                                    let s_clicked = self.suggestion_select_clicked.clone();
                                                    div()
                                                        .flex()
                                                        .flex_col()
                                                        .p_2()
                                                        .bg(if is_sel { theme.border } else { theme.bg_panel })
                                                        .border_1()
                                                        .border_color(if is_sel { accent_color } else { theme.bg_panel })
                                                        .rounded_md()
                                                        .cursor_pointer()
                                                        .on_mouse_down(gpui::MouseButton::Left, {
                                                            let c = s_clicked.clone();
                                                            move |_, _, _| { c.set(true); }
                                                        })
                                                        .child(
                                                            div()
                                                                .text_sm()
                                                                .text_color(theme.text_secondary)
                                                                .child(title),
                                                        )
                                                        .when(is_sel, |el| {
                                                            el.child(
                                                                div()
                                                                    .mt_1()
                                                                    .text_xs()
                                                                    .text_color(theme.text_muted)
                                                                    .child(desc),
                                                            )
                                                            .child(
                                                                div()
                                                                    .mt_2()
                                                                    .flex()
                                                                    .justify_end()
                                                                    .child(
                                                                        div()
                                                                            .px_2()
                                                                            .py_1()
                                                                            .bg(theme.playhead)
                                                                            .text_color(theme.text_primary)
                                                                            .rounded_sm()
                                                                            .text_xs()
                                                                            .cursor_pointer()
                                                                            .hover(|s| s.bg(theme.bg_hover))
                                                                            .child("Dismiss")
                                                                            .on_mouse_down(gpui::MouseButton::Left, {
                                                                                let sg = sugs.clone();
                                                                                let idx = i;
                                                                                let sc = s_clicked.clone();
                                                                                move |_, _, cx| {
                                                                                    cx.stop_propagation();
                                                                                    let sg2 = sg.clone();
                                                                                    tokio::spawn(async move {
                                                                                        let mut guard = sg2.lock().await;
                                                                                        if idx < guard.len() {
                                                                                            guard.remove(idx);
                                                                                        }
                                                                                    });
                                                                                    sc.set(true);
                                                                                }
                                                                            }),
                                                                    ),
                                                            )
                                                        })
                                                })),
                                        )
                                    }),
                            ),
                    ),
            )
            .when(self.exporting.load(Ordering::SeqCst), |el| {
                let elapsed = self.export_start_time.map_or(0.0, |t| t.elapsed().as_secs_f32());
                let eta_text = if elapsed < 1.0 {
                    "Exporting...".into()
                } else {
                    format!("Exporting... (elapsed: {:.0}s, est. total: ~{:.0}s)", elapsed, elapsed * 2.5)
                };
                el.child(
                    div()
                        .h(px(28.0))
                        .flex()
                        .items_center()
                        .px_3()
                        .bg(theme.bg_hover)
                        .border_t_1()
                        .border_color(theme.accent_primary)
                        .child(
                            div()
                                .text_sm()
                                .text_color(theme.accent_primary)
                                .child(eta_text),
                        ),
                )
            })
            // Error banner — displayed when an error has occurred
            .when(self.show_error, |el| {
                let error_text = self.error_message.clone().unwrap_or_else(|| "An unknown error occurred".to_string());
                el.child(
                    div()
                        .h(px(32.0))
                        .flex()
                        .items_center()
                        .justify_between()
                        .px_4()
                        .bg(theme.bg_hover)
                        .border_t_1()
                        .border_color(theme.playhead)
                        .child(
                            div()
                                .flex()
                                .items_center()
                                .gap_2()
                                .child(
                                    div()
                                        .text_sm()
                                        .text_color(theme.text_primary)
                                        .child("⚠")
                                )
                                .child(
                                    div()
                                        .text_sm()
                                        .text_color(theme.text_primary)
                                        .child(error_text)
                                ),
                        )
                        .child(
                            div()
                                .text_sm()
                                .text_color(theme.text_muted)
                                .cursor_pointer()
                                .hover(|s| s.text_color(theme.text_primary))
                                .child("Dismiss")
                                .on_mouse_down(gpui::MouseButton::Left, move |_, _, _| {})
                        ),
                )
            })
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
            agent_active: Rc::new(Cell::new(false)),
            agent_suggestions: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            suggestions_expanded: false,
            suggestions_expand_clicked: Rc::new(Cell::new(false)),
            selected_suggestion: None,
            suggestion_select_clicked: Rc::new(Cell::new(false)),
            suggestion_select_idx: 0,
            frame_step_back5_clicked: Rc::new(Cell::new(false)),
            frame_step_back1_clicked: Rc::new(Cell::new(false)),
            frame_step_fwd1_clicked: Rc::new(Cell::new(false)),
            frame_step_fwd5_clicked: Rc::new(Cell::new(false)),
            exporting: Arc::new(AtomicBool::new(false)),
            export_start_time: None,
            error_message: None,
            show_error: false,
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
            agent_active: Rc::new(Cell::new(false)),
            agent_suggestions: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            suggestions_expanded: false,
            suggestions_expand_clicked: Rc::new(Cell::new(false)),
            selected_suggestion: None,
            suggestion_select_clicked: Rc::new(Cell::new(false)),
            suggestion_select_idx: 0,
            frame_step_back5_clicked: Rc::new(Cell::new(false)),
            frame_step_back1_clicked: Rc::new(Cell::new(false)),
            frame_step_fwd1_clicked: Rc::new(Cell::new(false)),
            frame_step_fwd5_clicked: Rc::new(Cell::new(false)),
            exporting: Arc::new(AtomicBool::new(false)),
            export_start_time: None,
            error_message: None,
            show_error: false,
        };

        assert!(!editor.is_playing);
        editor.toggle_playback();
        assert!(editor.is_playing);
        editor.toggle_playback();
        assert!(!editor.is_playing);
    }
}
