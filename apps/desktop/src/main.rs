use gpui::*;
use gpui_platform::application;
use lazynext_core::{NLEState, AutonomousEditor, VideoIntent};

struct LazynextDesktop {
    engine: NLEState,
    autonomous_agent: AutonomousEditor,
    status_text: String,
}

impl Render for LazynextDesktop {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let active_project = self.engine.get_project_data();
        let clip_count = active_project.tracks.iter().map(|t| t.clips.len()).sum::<usize>();

        div()
            .flex()
            .bg(rgb(0x050505)) // Deep Charcoal
            .size_full()
            .justify_center()
            .items_center()
            .text_color(rgb(0xffffff))
            .child(
                div()
                    .flex()
                    .flex_col()
                    .items_center()
                    .child(
                        div()
                            .text_xl()
                            .font_weight(FontWeight::BOLD)
                            .child(
                                div().flex().child("LAZYNEXT ").child(div().text_color(rgb(0x00e5ff)).child("NATIVE"))
                            )
                    )
                    .child(
                        div()
                            .mt_4()
                            .text_sm()
                            .text_color(rgb(0xa1a1aa))
                            .child(format!("Project: {}", active_project.name))
                    )
                    .child(
                        div()
                            .mt_2()
                            .text_sm()
                            .text_color(rgb(0x00e5ff)) // Vibrant Cyan
                            .child(format!("{} Clips Loaded via Core Logic", clip_count))
                    )
                    .child(
                        div()
                            .mt_6()
                            .text_sm()
                            .text_color(rgb(0x00e5ff)) // Cyan
                            .child(self.status_text.clone())
                    )
                    .child(
                        div()
                            .mt_8()
                            .flex()
                            .gap_4()
                            .child(
                                div()
                                    .bg(rgb(0x00e5ff)) // Cyan Primary
                                    .text_color(rgb(0x050505))
                                    .px_4()
                                    .py_2()
                                    .rounded_md()
                                    .cursor_pointer()
                                    .hover(|s| s.bg(rgb(0x00b3cc)))
                                    .on_mouse_down(MouseButton::Left, cx.listener(|view: &mut LazynextDesktop, _, _, cx| {
                                        let intent = VideoIntent {
                                            prompt: "Cut the silence".to_string(),
                                            require_plan_approval: false,
                                            source_files: vec![],
                                        };
                                        let result = view.autonomous_agent.process_intent_sync(&mut view.engine, &intent);
                                        match result {
                                            Ok(msg) => view.status_text = format!("Success: {}", msg),
                                            Err(e) => view.status_text = format!("Error: {}", e),
                                        }
                                        cx.notify();
                                    }))
                                    .child(div().font_weight(FontWeight::BOLD).child("Trigger AI 'Cut'"))
                            )
                            .child(
                                div()
                                    .bg(rgb(0x0033ff)) // Deep Blue
                                    .border_1()
                                    .border_color(rgb(0x0022cc))
                                    .text_color(rgb(0xffffff))
                                    .px_4()
                                    .py_2()
                                    .rounded_md()
                                    .cursor_pointer()
                                    .hover(|s| s.bg(rgb(0x0022cc)))
                                    .on_mouse_down(MouseButton::Left, cx.listener(|view: &mut LazynextDesktop, _, _, cx| {
                                        let intent = VideoIntent {
                                            prompt: "Add cinematic music".to_string(),
                                            require_plan_approval: false,
                                            source_files: vec![],
                                        };
                                        let result = view.autonomous_agent.process_intent_sync(&mut view.engine, &intent);
                                        match result {
                                            Ok(msg) => view.status_text = format!("Success: {}", msg),
                                            Err(e) => view.status_text = format!("Error: {}", e),
                                        }
                                        cx.notify();
                                    }))
                                    .child(div().font_weight(FontWeight::BOLD).child("Trigger AI 'Music'"))
                            )
                    )
            )
    }
}

fn main() {
    println!("Starting Lazynext Desktop (GPUI)...");
    
    // Initialize the shared core business logic (Zero duplication from Web!)
    let mut engine = NLEState::new(
        "desktop_1".to_string(),
        "Untitled Native Film".to_string(),
        60
    );

    // Mock an initial clip state from core
    engine.add_track("Video 1".to_string(), "video".to_string());
    engine.add_clip_to_track(
        0, 
        "native_clip_1".to_string(), 
        "video".to_string(), 
        "Raw RED Footage".to_string(), 
        0, 
        300
    );

    application().run(move |cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(1200.0), px(800.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some(SharedString::from("Lazynext")),
                    appears_transparent: true,
                    ..Default::default()
                }),
                ..Default::default()
            },
            |_, cx| cx.new(|_| LazynextDesktop { 
                engine, 
                autonomous_agent: AutonomousEditor::new(),
                status_text: "Awaiting natural language edit...".to_string() 
            }),
        ).unwrap();
    });
}
