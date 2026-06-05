use gpui::*;
#[allow(unused_imports)]
use compositor::{Compositor, FrameDescriptor, CanvasClearDescriptor};
#[allow(unused_imports)]
use gpu::GpuContext;
use state::{ProjectData, Track, Clip};
use serde::Deserialize;
use std::fs;

struct AppWindow {
    project: ProjectData,
}

impl AppWindow {
    fn render_header(&self) -> impl IntoElement {
        div()
            .h(px(48.))
            .w_full()
            .bg(rgb(0x18181b)) // zinc-900 equivalent
            .border_b_1()
            .border_color(rgb(0x27272a)) // zinc-800
            .flex()
            .items_center()
            .justify_between()
            .px(px(16.))
            .child(
                div().text_sm().font_weight(FontWeight::BOLD).text_color(rgb(0xffffff)).child("Lazynext")
            )
            .child(
                div().flex().gap_2().child(
                    div().bg(rgb(0x3f3f46)).px(px(12.)).py(px(4.)).rounded_md().text_sm().text_color(rgb(0xffffff)).child("Export")
                )
            )
    }

    fn render_sidebar(&self) -> impl IntoElement {
        div()
            .w(px(240.))
            .h_full()
            .bg(rgb(0x18181b))
            .border_r_1()
            .border_color(rgb(0x27272a))
            .p(px(16.))
            .child(
                div().text_xs().text_color(rgb(0xa1a1aa)).mb(px(8.)).child("ASSETS")
            )
            .child(
                div().flex().flex_col().gap_2().child(
                    div().text_sm().text_color(rgb(0xffffff)).child("Video_Clip_01.mp4")
                ).child(
                    div().text_sm().text_color(rgb(0xffffff)).child("Audio_Track.wav")
                )
            )
    }

    fn render_canvas(&self) -> impl IntoElement {
        div()
            .flex_1()
            .h_full()
            .bg(rgb(0x09090b)) // zinc-950
            .flex()
            .items_center()
            .justify_center()
            .child(
                // Placeholder for wgpu texture render
                div()
                    .w(px(640.))
                    .h(px(360.))
                    .bg(rgb(0x000000))
                    .border_1()
                    .border_color(rgb(0x27272a))
                    .flex()
                    .items_center()
                    .justify_center()
                    .child(
                        div().text_sm().text_color(rgb(0x52525b)).child(format!("wgpu Canvas 1280x720"))
                    )
            )
    }

    fn render_agent_chat(&self) -> impl IntoElement {
        div()
            .h(px(250.))
            .w_full()
            .bg(rgb(0x18181b)) // zinc-900
            .border_t_1()
            .border_color(rgb(0x27272a))
            .flex()
            .flex_col()
            .p(px(16.))
            .child(
                div().text_sm().font_weight(FontWeight::BOLD).text_color(rgb(0x3b82f6)).mb(px(8.)).child("AGENT CHAT")
            )
            .child(
                div().flex_1().overflow_y_scroll().flex().flex_col().gap_2().child(
                    div().text_sm().text_color(rgb(0xa1a1aa)).child("System: Awaiting your instructions...")
                )
            )
            .child(
                div().h(px(40.)).w_full().bg(rgb(0x27272a)).rounded_md().flex().items_center().px(px(12.))
                    .child(div().text_sm().text_color(rgb(0x71717a)).child("Type a command (e.g., 'Cut out the silences')..."))
            )
    }
}

impl Render for AppWindow {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .size_full()
            .flex()
            .flex_col()
            .child(self.render_header())
            .child(
                div()
                    .flex_1()
                    .w_full()
                    .flex()
                    .child(self.render_sidebar())
                    .child(
                        div()
                            .flex_1()
                            .h_full()
                            .flex()
                            .flex_col()
                            .child(self.render_canvas())
                            .child(self.render_agent_chat())
                    )
            )
    }
}

fn main() {
    let mut project = ProjectData::new("proj_desktop".into(), "Lazynext Desktop Engine".into(), 60.0, 1280, 720);
    project.duration_frames = 1000;
    
    // Add a test track and clip to prove the engine works natively
    let mut track = Track {
        id: "t1".into(),
        name: "V1".into(),
        track_type: "video".into(),
        clips: vec![],
    };
    track.clips.push(Clip {
        id: "c1".into(),
        name: "Native Test Clip".into(),
        start_frame: 100,
        duration_frames: 300,
        media_id: "media_1".into(),
        is_disabled: false,
    });
    project.add_track(track);
    
    // Validate engine mutator works natively
    project.update_clip("c1", Some(50), None);
    

    Application::new().run(move |cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(1280.), px(800.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some("Lazynext Video Editor".into()),
                    appears_transparent: true,
                    traffic_light_position: Some(point(px(16.), px(16.))),
                }),
                ..Default::default()
            },
            move |_, cx| cx.new(|_| AppWindow { project: project.clone() }),
        )
        .unwrap();
        cx.activate(true);
    });
}
