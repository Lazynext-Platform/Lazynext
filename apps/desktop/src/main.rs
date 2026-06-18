use gpui::*;
use lazynext_core::{NLEState, autonomous::AutonomousEditor, autonomous::VideoIntent};

struct LazynextDesktop {
    engine: NLEState,
    autonomous_agent: AutonomousEditor,
    status_text: String,
    is_processing: bool,
}

impl Render for LazynextDesktop {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let active_project = self.engine.get_project_data();
        let track_count = active_project.tracks.len();
        let clip_count: usize = active_project.tracks.iter()
            .map(|t| t.clips.len())
            .sum();

        let status_color = if self.is_processing {
            rgb(0xf59e0b) // Amber while processing
        } else {
            rgb(0x10b981) // Green when idle
        };

        div()
            .flex()
            .bg(rgb(0x050505))
            .size_full()
            .child(
                // Main layout: sidebar + content
                div()
                    .flex()
                    .size_full()
                    // Sidebar
                    .child(
                        div()
                            .w(px(240.0))
                            .h_full()
                            .bg(rgb(0x0a0a0a))
                            .border_r_1()
                            .border_color(rgb(0x1f1f23))
                            .flex()
                            .flex_col()
                            .p_4()
                            .child(
                                div()
                                    .text_xl()
                                    .font_weight(FontWeight::BOLD)
                                    .mb_6()
                                    .child("LAZYNEXT")
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(rgb(0x71717a))
                                    .mb_2()
                                    .child("PROJECT")
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(rgb(0xffffff))
                                    .mb_4()
                                    .child(active_project.name.clone())
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap_1()
                                    .child(
                                        div().text_sm().text_color(rgb(0x71717a))
                                            .child(format!("{} tracks · {} clips", track_count, clip_count))
                                    )
                                    .child(
                                        div().text_sm().text_color(rgb(0x71717a))
                                            .child(format!("{} fps · {}×{}",
                                                active_project.framerate,
                                                active_project.width,
                                                active_project.height))
                                    )
                            )
                    )
                    // Content area
                    .child(
                        div()
                            .flex_1()
                            .flex()
                            .flex_col()
                            .justify_center()
                            .items_center()
                            .gap_4()
                            // Status
                            .child(
                                div()
                                    .px_4()
                                    .py_2()
                                    .rounded_md()
                                    .bg(rgb(0x0a0a0a))
                                    .border_1()
                                    .border_color(rgb(0x1f1f23))
                                    .text_color(status_color)
                                    .text_sm()
                                    .child(self.status_text.clone())
                            )
                            // AI buttons
                            .child(
                                div()
                                    .flex()
                                    .gap_3()
                                    .child(
                                        div()
                                            .bg(rgb(0x00e5ff))
                                            .text_color(rgb(0x050505))
                                            .px_4()
                                            .py_2()
                                            .rounded_md()
                                            .font_weight(FontWeight::BOLD)
                                            .text_sm()
                                            .cursor_pointer()
                                            .hover(|s| s.bg(rgb(0x00b3cc)))
                                            .on_mouse_down(MouseButton::Left, cx.listener(|this: &mut LazynextDesktop, _, _, cx| {
                                                this.is_processing = true;
                                                let intent = VideoIntent {
                                                    prompt: "Cut the silence and add cinematic color grade".to_string(),
                                                    require_plan_approval: false,
                                                    source_files: vec![],
                                                };
                                                let result = this.autonomous_agent.process_intent_sync(&mut this.engine, &intent);
                                                this.status_text = match result {
                                                    Ok(msg) => format!("✓ {}", msg),
                                                    Err(e) => format!("✗ {}", e),
                                                };
                                                this.is_processing = false;
                                                cx.notify();
                                            }))
                                            .child("Trim Silence")
                                    )
                                    .child(
                                        div()
                                            .bg(rgb(0x0033ff))
                                            .border_1()
                                            .border_color(rgb(0x0022cc))
                                            .text_color(rgb(0xffffff))
                                            .px_4()
                                            .py_2()
                                            .rounded_md()
                                            .font_weight(FontWeight::BOLD)
                                            .text_sm()
                                            .cursor_pointer()
                                            .hover(|s| s.bg(rgb(0x0022cc)))
                                            .on_mouse_down(MouseButton::Left, cx.listener(|this: &mut LazynextDesktop, _, _, cx| {
                                                this.is_processing = true;
                                                let intent = VideoIntent {
                                                    prompt: "Add cinematic background music".to_string(),
                                                    require_plan_approval: false,
                                                    source_files: vec![],
                                                };
                                                let result = this.autonomous_agent.process_intent_sync(&mut this.engine, &intent);
                                                this.status_text = match result {
                                                    Ok(msg) => format!("✓ {}", msg),
                                                    Err(e) => format!("✗ {}", e),
                                                };
                                                this.is_processing = false;
                                                cx.notify();
                                            }))
                                            .child("Add Music")
                                    )
                            )
                    )
            )
    }
}

fn main() {
    println!("🚀 Starting Lazynext Desktop (GPUI Native)...");

    let mut engine = NLEState::new(
        "desktop_1".to_string(),
        "Untitled Native Film".to_string(),
        60,
    );

    // Initialize with demo project state
    engine.add_track("Video 1".to_string(), "video".to_string());
    engine.add_clip_to_track(
        0,
        "native_clip_1".to_string(),
        "video".to_string(),
        "Raw RED Footage".to_string(),
        0,
        300,
    );
    engine.add_track("Audio 1".to_string(), "audio".to_string());
    engine.add_clip_to_track(
        1,
        "native_audio_1".to_string(),
        "audio".to_string(),
        "Production Audio".to_string(),
        0,
        300,
    );

    application().run(move |cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(1400.0), px(900.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some(SharedString::from("Lazynext — Native NLE")),
                    appears_transparent: true,
                    ..Default::default()
                }),
                ..Default::default()
            },
            |_, cx| {
                cx.new(|_| LazynextDesktop {
                    engine,
                    autonomous_agent: AutonomousEditor::new(),
                    status_text: "Ready — use natural language to edit".to_string(),
                    is_processing: false,
                })
            },
        )
        .unwrap();
    });
}
