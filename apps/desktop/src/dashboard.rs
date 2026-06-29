use crate::editor::EditorShell;
use gpui::*;
use lazynext_core::NLEState;
use lazynext_core::engine::CoreEngine;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct Dashboard {
    pub version: String,
    pub nle: Arc<Mutex<NLEState>>,
    pub engine: Arc<Mutex<CoreEngine>>,
    pub rt_handle: tokio::runtime::Handle,
}

impl Dashboard {
    pub fn new(
        nle: Arc<Mutex<NLEState>>,
        engine: Arc<Mutex<CoreEngine>>,
        rt_handle: tokio::runtime::Handle,
    ) -> Self {
        Self {
            version: "0.1.0".to_string(),
            nle,
            engine,
            rt_handle,
        }
    }
}

impl Render for Dashboard {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let bg = rgb(0x1a1a1a);
        let accent = rgb(0x00d4df);

        div()
            .flex()
            .flex_col()
            .w_full()
            .h_full()
            .bg(bg)
            .justify_center()
            .items_center()
            .child(
                div()
                    .text_xl()
                    .font_weight(FontWeight::BOLD)
                    .text_color(rgb(0xffffff))
                    .child("Lazynext Dashboard"),
            )
            .child(
                div()
                    .mt_4()
                    .text_sm()
                    .text_color(rgb(0xaaaaaa))
                    .child(format!("Version {}", self.version)),
            )
            .child(
                div()
                    .mt_8()
                    .flex()
                    .gap_4()
                    .child(
                        div()
                            .p_3()
                            .bg(accent)
                            .text_color(rgb(0x000000))
                            .rounded_md()
                            .cursor_pointer()
                            .hover(|s| s.bg(rgb(0x00b4bf)))
                            .child("New Project")
                            .on_mouse_down(gpui::MouseButton::Left, {
                                let nle = self.nle.clone();
                                let engine = self.engine.clone();
                                let rt_handle = self.rt_handle.clone();
                                move |_, window, cx| {
                                    let bounds = Bounds {
                                        origin: point(px(0.0), px(0.0)),
                                        size: size(px(1280.0), px(720.0)),
                                    };
                                    cx.open_window(
                                        WindowOptions {
                                            window_bounds: Some(WindowBounds::Windowed(bounds)),
                                            titlebar: Some(TitlebarOptions {
                                                title: Some("Lazynext Editor".into()),
                                                appears_transparent: true,
                                                traffic_light_position: None,
                                            }),
                                            ..Default::default()
                                        },
                                        |_, cx| {
                                            cx.new(|_| EditorShell {
                                                nle: nle.clone(),
                                                engine: engine.clone(),
                                                rt_handle: rt_handle.clone(),
                                                last_frame_data: None,
                                                current_frame: 0,
                                            })
                                        },
                                    )
                                    .unwrap();

                                    // Optional: close the dashboard window
                                    // window.remove_window(); // not available easily here, usually we just leave it open or handle properly
                                }
                            }),
                    )
                    .child(
                        div()
                            .p_3()
                            .bg(rgb(0x333333))
                            .text_color(rgb(0xffffff))
                            .rounded_md()
                            .cursor_pointer()
                            .hover(|s| s.bg(rgb(0x444444)))
                            .child("Open Project")
                            .on_mouse_down(gpui::MouseButton::Left, {
                                let nle = self.nle.clone();
                                let engine = self.engine.clone();
                                let rt_handle = self.rt_handle.clone();
                                move |_, window, cx| {
                                    // Normally we would use rfd::AsyncFileDialog here
                                    let dialog = rfd::FileDialog::new()
                                        .set_title("Open Lazynext Project")
                                        .add_filter("Lazynext Project", &["lazynext"]);
                                    if let Some(path) = dialog.pick_file() {
                                        if let Ok(json) = std::fs::read_to_string(&path) {
                                            if let Ok(pd) = serde_json::from_str::<
                                                lazynext_core::nle_state::ProjectData,
                                            >(
                                                &json
                                            ) {
                                                rt_handle.block_on(async {
                                                    let mut state = nle.lock().await;
                                                    state.load_project_data(pd);
                                                });
                                                log::info!(
                                                    "Project loaded from {}",
                                                    path.display()
                                                );
                                            }
                                        }
                                    }

                                    let bounds = Bounds {
                                        origin: point(px(0.0), px(0.0)),
                                        size: size(px(1280.0), px(720.0)),
                                    };
                                    cx.open_window(
                                        WindowOptions {
                                            window_bounds: Some(WindowBounds::Windowed(bounds)),
                                            titlebar: Some(TitlebarOptions {
                                                title: Some("Lazynext Editor".into()),
                                                appears_transparent: true,
                                                traffic_light_position: None,
                                            }),
                                            ..Default::default()
                                        },
                                        |_, cx| {
                                            cx.new(|_| EditorShell {
                                                nle: nle.clone(),
                                                engine: engine.clone(),
                                                rt_handle: rt_handle.clone(),
                                                last_frame_data: None,
                                                current_frame: 0,
                                            })
                                        },
                                    )
                                    .unwrap();
                                }
                            }),
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
    async fn test_dashboard_creation() {
        let nle = Arc::new(Mutex::new(NLEState::new(
            "test_session".to_string(),
            "Test Project".to_string(),
            24,
        )));

        let rt_handle = tokio::runtime::Handle::current();
        let engine = Arc::new(Mutex::new(CoreEngine::init(nle.clone()).await.unwrap()));

        let dashboard = Dashboard::new(nle, engine, rt_handle);
        assert_eq!(dashboard.version, "0.1.0");
    }
}
