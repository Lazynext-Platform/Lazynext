use gpui::*;

struct Dashboard {
    project_name: String,
    status: String,
}

impl Render for Dashboard {
    fn render(&mut self, _cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w_full()
            .h_full()
            .bg(rgb(0x050505))
            .text_color(rgb(0xffffff))
            .p_8()
            .child(
                div()
                    .text_3xl()
                    .font_weight(FontWeight::BOLD)
                    .child(format!("Lazynext Desktop: {}", self.project_name)),
            )
            .child(
                div()
                    .mt_4()
                    .text_xl()
                    .text_color(rgb(0x10b981))
                    .child(format!("Status: {}", self.status)),
            )
            .child(
                div()
                    .mt_8()
                    .p_4()
                    .bg(rgb(0x18181b))
                    .border_1()
                    .border_color(rgb(0x27272a))
                    .rounded_md()
                    .child("Connected to API Gateway. System telemetry optimal."),
            )
    }
}

fn main() {
    println!("Starting Lazynext GPUI Desktop App...");
    
    // Fallback if GPUI is not supported on this headless environment
    if std::env::var("LAZYNEXT_HEADLESS").is_ok() {
        println!("Headless mode: Skipping GPUI window creation.");
        return;
    }

    App::new().run(|cx: &mut AppContext| {
        cx.open_window(WindowOptions::default(), |cx| {
            cx.new_view(|_cx| Dashboard {
                project_name: "Rust Desktop Client".into(),
                status: "Connected".into(),
            })
        });
    });
}
