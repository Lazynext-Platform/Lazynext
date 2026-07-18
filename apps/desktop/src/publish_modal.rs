//! Desktop GPUI Publish Modal
//!
//! Handles metadata input and dispatching to the Lazynext API Gateway
//! for social media publishing (TikTok, YouTube, Instagram).

use gpui::*;

pub struct PublishModal {
    title: String,
    description: String,
    platforms: Vec<String>,
}

impl PublishModal {
    pub fn new() -> Self {
        Self {
            title: String::new(),
            description: String::new(),
            platforms: Vec::new(),
        }
    }

    fn toggle_platform(&mut self, platform: &str, cx: &mut Context<Self>) {
        if let Some(pos) = self.platforms.iter().position(|p| p == platform) {
            self.platforms.remove(pos);
        } else {
            self.platforms.push(platform.to_string());
        }
        cx.notify();
    }

    fn render_platform_button(
        &self,
        name: &str,
        id: &str,
        color: Rgba,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        let is_selected = self.platforms.iter().any(|p| p == id);
        let id_str = id.to_string();
        
        let bg_color = if is_selected {
            color
        } else {
            rgb(0x333333)
        };

        div()
            .bg(bg_color)
            .border_1()
            .border_color(rgb(0x555555))
            .rounded_md()
            .p_2()
            .cursor_pointer()
            .on_mouse_down(gpui::MouseButton::Left, cx.listener(move |this, _, _, cx| this.toggle_platform(&id_str, cx)))
            .child(name.to_string())
    }
}

impl Render for PublishModal {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .bg(rgb(0x1e1e1e))
            .p_4()
            .rounded_xl()
            .w(px(400.0))
            .child(div().text_xl().font_weight(FontWeight::BOLD).child("Publish to Socials"))
            .child(div().h(px(10.0)))
            .child(div().text_sm().text_color(rgb(0xaaaaaa)).child("Push your exported video directly to connected social accounts."))
            .child(div().h(px(20.0)))
            .child(
                div()
                    .flex()
                    .gap_2()
                    .child(self.render_platform_button("TikTok", "tiktok", rgb(0x000000), cx))
                    .child(self.render_platform_button("YouTube", "youtube", rgb(0xff0000), cx))
                    .child(self.render_platform_button("Instagram", "instagram", rgb(0xe1306c), cx))
            )
            .child(div().h(px(20.0)))
            .child(
                div()
                    .bg(rgb(0x4f46e5))
                    .text_color(rgb(0xffffff))
                    .font_weight(FontWeight::BOLD)
                    .p_2()
                    .rounded_md()
                    .flex()
                    .justify_center()
                    .cursor_pointer()
                    .on_mouse_down(gpui::MouseButton::Left, cx.listener(|_, _, _, _cx| {
                        log::info!("Triggering publish via Gateway API...");
                        // In a real app, this dispatches a reqwest POST to Gateway.
                    }))
                    .child(format!("Publish to {} platform(s)", self.platforms.len()))
            )
    }
}
