//! Project dashboard shell.
//!
//! Renders the project list, recent files, create/delete buttons,
//! and hands off to the EditorShell when a project is opened.

use crate::editor::EditorShell;
use gpui::prelude::FluentBuilder;
use gpui::*;
use lazynext_core::NLEState;
use lazynext_core::engine::CoreEngine;
use std::cell::Cell;
use std::rc::Rc;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use tokio::sync::Mutex;

/// Project dashboard view showing recent projects and create/open actions.
pub struct Dashboard {
    /// Application version string.
    pub version: String,
    /// Shared CRDT NLE state for the project.
    pub nle: Arc<Mutex<NLEState>>,
    /// Core rendering/editing engine.
    pub engine: Arc<Mutex<CoreEngine>>,
    /// Tokio runtime handle for blocking async work.
    pub rt_handle: tokio::runtime::Handle,
    /// Paths of recently opened projects.
    pub recent_projects: Vec<String>,
    /// Flag set when a recent project should be added.
    pub recent_add_clicked: Rc<Cell<bool>>,
    /// Path of the recent project pending addition.
    pub recent_add_path: Rc<Cell<Option<String>>>,
}

impl Dashboard {
    /// Create a new dashboard, loading the list of recent projects from disk.
    pub fn new(
        nle: Arc<Mutex<NLEState>>,
        engine: Arc<Mutex<CoreEngine>>,
        rt_handle: tokio::runtime::Handle,
    ) -> Self {
        let recent_projects = Self::load_recent_projects();
        Self {
            version: "0.1.0".to_string(),
            nle,
            engine,
            rt_handle,
            recent_projects,
            recent_add_clicked: Rc::new(Cell::new(false)),
            recent_add_path: Rc::new(Cell::new(None)),
        }
    }

    // Returns the path to the recent-projects JSON file under the user's home directory.
    fn recent_projects_path() -> std::path::PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        std::path::PathBuf::from(home)
            .join(".lazynext")
            .join("recent_projects.json")
    }

    // Loads up to 5 recent project paths from disk, returning empty on failure.
    fn load_recent_projects() -> Vec<String> {
        let path = Self::recent_projects_path();
        if let Ok(data) = std::fs::read_to_string(&path)
            && let Ok(projects) = serde_json::from_str::<Vec<String>>(&data)
        {
            return projects.iter().take(5).cloned().collect();
        }
        Vec::new()
    }

    // Writes the current recent-projects list to disk as JSON.
    fn save_recent_projects(&self) {
        let path = Self::recent_projects_path();
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(
            &path,
            serde_json::to_string(&self.recent_projects).unwrap_or_default(),
        );
    }

    // Moves a project path to the front of the recent list (capped at 5) and persists it.
    fn add_recent_project(&mut self, path: &str) {
        self.recent_projects.retain(|p| p != path);
        self.recent_projects.insert(0, path.to_string());
        self.recent_projects.truncate(5);
        self.save_recent_projects();
    }
}

impl Render for Dashboard {
    // Builds the dashboard view: project list, recent files, and create/open actions.
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let theme = crate::theme::Theme::from_appearance(_window.appearance());
        let bg = theme.bg_main;
        let accent = theme.accent_primary;

        // Process recent project addition
        if self.recent_add_clicked.get() {
            self.recent_add_clicked.set(false);
            if let Some(path) = self.recent_add_path.take() {
                self.add_recent_project(&path);
            }
        }

        let current_override = std::env::var("LAZYNEXT_THEME").unwrap_or_else(|_| "system".to_string());
        let mode_label = if current_override == "system" {
            let actual_os = match _window.appearance() {
                gpui::WindowAppearance::Dark | gpui::WindowAppearance::VibrantDark => "Dark",
                _ => "Light",
            };
            format!("Theme: System ({})", actual_os)
        } else {
            format!("Theme: {}", current_override)
        };

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
                    .absolute()
                    .top_4()
                    .right_4()
                    .text_xs()
                    .font_weight(FontWeight::BOLD)
                    .text_color(theme.text_primary)
                    .bg(theme.bg_panel)
                    .border_1()
                    .border_color(theme.border)
                    .rounded_md()
                    .p_2()
                    .cursor_pointer()
                    .hover(|s| s.bg(theme.bg_hover))
                    .on_mouse_down(gpui::MouseButton::Left, move |_, _, _cx| {
                        let next = match current_override.as_str() {
                            "system" => "dark",
                            "dark" => "light",
                            _ => "system",
                        };
                        unsafe {
                            std::env::set_var("LAZYNEXT_THEME", next);
                        }
                    })
                    .child(mode_label),
            )
            .child(
                div()
                    .text_xl()
                    .font_weight(FontWeight::BOLD)
                    .text_color(theme.text_primary)
                    .child("Lazynext Dashboard"),
            )
            .child(
                div()
                    .mt_4()
                    .text_sm()
                    .text_color(theme.text_secondary)
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
                            .text_color(theme.bg_main)
                            .rounded_md()
                            .cursor_pointer()
                            .hover(|s| s.bg(theme.accent_secondary))
                            .child("New Project")
                            .on_mouse_down(gpui::MouseButton::Left, {
                                let nle = self.nle.clone();
                                let engine = self.engine.clone();
                                let rt_handle = self.rt_handle.clone();
                                move |_, _window, cx| {
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
                                                is_playing: false,
                                                ai_prompt_text: String::new(),
                                                play_clicked: Rc::new(Cell::new(false)),
                                                prompt_focused: Rc::new(Cell::new(false)),
                                                prompt_clicked: Rc::new(Cell::new(false)),
                                                agent_active: Rc::new(Cell::new(false)),
                                                agent_suggestions: Arc::new(
                                                    tokio::sync::Mutex::new(Vec::new()),
                                                ),
                                                suggestions_expanded: false,
                                                suggestions_expand_clicked: Rc::new(Cell::new(
                                                    false,
                                                )),
                                                selected_suggestion: None,
                                                suggestion_select_clicked: Rc::new(Cell::new(
                                                    false,
                                                )),
                                                suggestion_select_idx: 0,
                                                frame_step_back5_clicked: Rc::new(Cell::new(false)),
                                                frame_step_back1_clicked: Rc::new(Cell::new(false)),
                                                frame_step_fwd1_clicked: Rc::new(Cell::new(false)),
                                                frame_step_fwd5_clicked: Rc::new(Cell::new(false)),
                                                exporting: Arc::new(AtomicBool::new(false)),
                                                export_start_time: None,
                                                error_message: None,
                                                show_error: false,
                                            })
                                        },
                                    )
                                    .expect("Failed to open new project editor window");
                                }
                            }),
                    )
                    .child(
                        div()
                            .p_3()
                            .bg(theme.bg_panel)
                            .text_color(theme.text_primary)
                            .rounded_md()
                            .cursor_pointer()
                            .hover(|s| s.bg(theme.bg_hover))
                            .child("Open Project")
                            .on_mouse_down(gpui::MouseButton::Left, {
                                let nle = self.nle.clone();
                                let engine = self.engine.clone();
                                let rt_handle = self.rt_handle.clone();
                                let recent_clicked = self.recent_add_clicked.clone();
                                let recent_path = self.recent_add_path.clone();
                                move |_, _window, cx| {
                                    // Normally we would use rfd::AsyncFileDialog here
                                    let dialog = rfd::FileDialog::new()
                                        .set_title("Open Lazynext Project")
                                        .add_filter("Lazynext Project", &["lazynext"]);
                                    if let Some(path) = dialog.pick_file()
                                        && let Ok(json) = std::fs::read_to_string(&path)
                                        && let Ok(pd) =
                                            serde_json::from_str::<
                                                lazynext_core::nle_state::ProjectData,
                                            >(&json)
                                    {
                                        rt_handle.block_on(async {
                                            let mut state = nle.lock().await;
                                            state.load_project_data(pd);
                                        });
                                        recent_path.set(Some(path.to_string_lossy().to_string()));
                                        recent_clicked.set(true);
                                        log::info!("Project loaded from {}", path.display());
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
                                                is_playing: false,
                                                ai_prompt_text: String::new(),
                                                play_clicked: Rc::new(Cell::new(false)),
                                                prompt_focused: Rc::new(Cell::new(false)),
                                                prompt_clicked: Rc::new(Cell::new(false)),
                                                agent_active: Rc::new(Cell::new(false)),
                                                agent_suggestions: Arc::new(
                                                    tokio::sync::Mutex::new(Vec::new()),
                                                ),
                                                suggestions_expanded: false,
                                                suggestions_expand_clicked: Rc::new(Cell::new(
                                                    false,
                                                )),
                                                selected_suggestion: None,
                                                suggestion_select_clicked: Rc::new(Cell::new(
                                                    false,
                                                )),
                                                suggestion_select_idx: 0,
                                                frame_step_back5_clicked: Rc::new(Cell::new(false)),
                                                frame_step_back1_clicked: Rc::new(Cell::new(false)),
                                                frame_step_fwd1_clicked: Rc::new(Cell::new(false)),
                                                frame_step_fwd5_clicked: Rc::new(Cell::new(false)),
                                                exporting: Arc::new(AtomicBool::new(false)),
                                                export_start_time: None,
                                                error_message: None,
                                                show_error: false,
                                            })
                                        },
                                    )
                                    .expect("Failed to open new project editor window");
                                }
                            }),
                    ),
            )
            .when(!self.recent_projects.is_empty(), |el| {
                el.child(
                    div()
                        .mt_10()
                        .flex()
                        .flex_col()
                        .gap_3()
                        .child(
                            div()
                                .text_sm()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme.text_muted)
                                .child("Recent Projects"),
                        )
                        .children(self.recent_projects.iter().map(|p| {
                            let path = p.clone();
                            div()
                                .px_4()
                                .py_2()
                                .bg(theme.bg_panel)
                                .border_1()
                                .border_color(theme.bg_panel)
                                .rounded_md()
                                .cursor_pointer()
                                .hover(|s| s.bg(theme.bg_hover))
                                .child(
                                    div().text_sm().text_color(theme.text_secondary).child(
                                        std::path::Path::new(&path)
                                            .file_name()
                                            .map(|n| n.to_string_lossy().to_string())
                                            .unwrap_or_else(|| path.clone()),
                                    ),
                                )
                                .on_mouse_down(gpui::MouseButton::Left, {
                                    let nle = self.nle.clone();
                                    let engine = self.engine.clone();
                                    let rt_handle = self.rt_handle.clone();
                                    let path_c = path.clone();
                                    move |_, _window, cx| {
                                        if let Ok(json) = std::fs::read_to_string(&path_c)
                                            && let Ok(pd) = serde_json::from_str::<
                                                lazynext_core::nle_state::ProjectData,
                                            >(
                                                &json
                                            )
                                        {
                                            rt_handle.block_on(async {
                                                let mut state = nle.lock().await;
                                                state.load_project_data(pd);
                                            });
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
                                                    is_playing: false,
                                                    ai_prompt_text: String::new(),
                                                    play_clicked: Rc::new(Cell::new(false)),
                                                    prompt_focused: Rc::new(Cell::new(false)),
                                                    prompt_clicked: Rc::new(Cell::new(false)),
                                                    agent_active: Rc::new(Cell::new(false)),
                                                    agent_suggestions: Arc::new(
                                                        tokio::sync::Mutex::new(Vec::new()),
                                                    ),
                                                    suggestions_expanded: false,
                                                    suggestions_expand_clicked: Rc::new(Cell::new(
                                                        false,
                                                    )),
                                                    selected_suggestion: None,
                                                    suggestion_select_clicked: Rc::new(Cell::new(
                                                        false,
                                                    )),
                                                    suggestion_select_idx: 0,
                                                    frame_step_back5_clicked: Rc::new(Cell::new(
                                                        false,
                                                    )),
                                                    frame_step_back1_clicked: Rc::new(Cell::new(
                                                        false,
                                                    )),
                                                    frame_step_fwd1_clicked: Rc::new(Cell::new(
                                                        false,
                                                    )),
                                                    frame_step_fwd5_clicked: Rc::new(Cell::new(
                                                        false,
                                                    )),
                                                    exporting: Arc::new(AtomicBool::new(false)),
                                                    export_start_time: None,
                                                    error_message: None,
                                                    show_error: false,
                                                })
                                            },
                                        )
                                        .expect("Failed to open new project editor window");
                                    }
                                })
                        })),
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
    async fn test_dashboard_creation() {
        let nle = Arc::new(Mutex::new(NLEState::new(
            "test_session".to_string(),
            "Test Project".to_string(),
            24,
        )));

        let rt_handle = tokio::runtime::Handle::current();
        let engine = Arc::new(Mutex::new(CoreEngine::init(nle.clone()).await.unwrap()));

        let dashboard = Dashboard::new(
            nle,
            engine,
            rt_handle,
        );
        assert_eq!(dashboard.version, "0.1.0");
    }
}
