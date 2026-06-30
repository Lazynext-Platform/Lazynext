use gpui::prelude::*;
use gpui::*;
use lazynext_core::NLEState;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct EditorShell {
    pub nle: Arc<Mutex<NLEState>>,
    pub engine: Arc<Mutex<lazynext_core::engine::CoreEngine>>,
    pub rt_handle: tokio::runtime::Handle,
    pub last_frame_data: Option<gpui::ImageSource>,
    pub current_frame: u32,
    pub is_playing: bool,
}

impl EditorShell {
    #[allow(dead_code)] // wired when full GPUI playback loop is implemented
    fn toggle_playback(&mut self) {
        self.is_playing = !self.is_playing;
    }

    /// Timeline constants — zoomed so the visible range covers ~10 seconds at 24 fps.
    const TIMELINE_PX_PER_FRAME: f32 = 1.5;
    const _TIMELINE_LEFT_MARGIN: f32 = 100.0; // reserved for future ruler
}

impl Render for EditorShell {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let bg_color = rgb(0x121212); // Deep dark gray/black background
        let panel_bg = rgb(0x1e1e1e);
        let border_color = rgb(0x2a2a2a);
        let accent_color = rgb(0x00d4df); // Cyan

        // Fetch dynamic project data from NLE state and render frame
        let (pd, frame_data) = self.rt_handle.block_on(async {
            let nle_guard = self.nle.lock().await;
            let pd = nle_guard.get_project_data().clone();

            let engine = self.engine.lock().await;
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
                                            .child("Project Media"),
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
                                        move |_, _, _cx| {
                                            log::info!("Play/Pause toggled in desktop editor");
                                        }
                                    }),
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(rgb(0x888888))
                                    .child(format!("Frame {}", self.current_frame)),
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
                                    .children(pd.tracks.iter().enumerate().map(|(_i, track)| {
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
                            // --- NEW AI PROMPT BAR ---
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
                                        div()
                                            .p_3()
                                            .bg(rgb(0x0a0a0a))
                                            .border_1()
                                            .border_color(accent_color)
                                            .rounded_md()
                                            .child(
                                                div()
                                                    .text_sm()
                                                    .text_color(rgb(0xcccccc))
                                                    .child("Type a command (e.g. 'cut silences')"),
                                            ),
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
                                                move |_, _, _cx| {
                                                    log::info!("AI Command triggered from Desktop UI!");
                                                    let gateway = std::env::var("RUST_API_GATEWAY_URL")
                                                        .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                                                    tokio::spawn(async move {
                                                        let client = reqwest::Client::new();
                                                        match client
                                                            .post(format!("{}/api/v1/autonomous_edit", gateway))
                                                            .json(&serde_json::json!({
                                                                "prompt": "Apply cinematic color grade and remove silences",
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
        };

        assert!(!editor.is_playing);
        editor.toggle_playback();
        assert!(editor.is_playing);
        editor.toggle_playback();
        assert!(!editor.is_playing);
    }
}
