use gpui::*;
use lazynext_core::NLEState;

struct LazynextDesktop {
    engine: NLEState,
    text: String,
}

impl Render for LazynextDesktop {
    fn render(&mut self, _cx: &mut ViewContext<Self>) -> impl IntoElement {
        let active_project = self.engine.get_project_data();
        let clip_count = active_project.tracks.iter().map(|t| t.clips.len()).sum::<usize>();

        div()
            .flex()
            .bg(rgb(0x09090b)) // Zinc 950
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
                            .child("LAZYNEXT 2025 NATIVE")
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
                            .text_color(rgb(0x22d3ee)) // Cyan 400
                            .child(format!("{} Clips Loaded via Core Logic", clip_count))
                    )
            )
    }
}

fn main() {
    println!("Starting Lazynext 2025 Desktop (GPUI)...");
    
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

    App::new().run(move |cx: &mut AppContext| {
        let bounds = Bounds::centered(None, size(px(1200.0), px(800.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some(SharedString::from("Lazynext 2025")),
                    appears_transparent: true,
                    ..Default::default()
                }),
                ..Default::default()
            },
            |cx| cx.new_view(|_| LazynextDesktop { 
                engine, 
                text: "Native GPUI Shell initialized.".to_string() 
            }),
        );
    });
}
