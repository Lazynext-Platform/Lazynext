use gpui::*;
use serde::Deserialize;
use std::sync::Arc;

pub struct PromotionsPane {
    balance: f32,
    referral_link: String,
    code_input: String,
    status_message: Option<String>,
}

#[derive(Deserialize)]
struct WalletResponse {
    success: bool,
    balance: i32,
}

#[derive(Deserialize)]
struct ReferralResponse {
    success: bool,
    referral_link: String,
}

#[derive(Deserialize)]
struct ApplyResponse {
    success: bool,
    discount_applied: Option<i32>,
    error: Option<String>,
}

impl PromotionsPane {
    pub fn new(cx: &mut WindowContext) -> View<Self> {
        let view = cx.new_view(|cx| {
            let mut pane = Self {
                balance: 0.0,
                referral_link: "Loading...".to_string(),
                code_input: "".to_string(),
                status_message: None,
            };
            
            // Spawn async task to fetch actual data
            cx.spawn(|view, mut cx| async move {
                let client = reqwest::Client::new();
                let base_url = "https://api.lazynext.com/api/v1";
                let token = "placeholder_desktop_token"; // In real app, fetch from keychain

                // Fetch Wallet
                if let Ok(res) = client.get(format!("{}/promotions/wallet", base_url))
                    .header("Authorization", format!("Bearer {}", token))
                    .send().await {
                    if let Ok(data) = res.json::<WalletResponse>().await {
                        if data.success {
                            let _ = view.update(&mut cx, |this, cx| {
                                this.balance = data.balance as f32 / 100.0;
                                cx.notify();
                            });
                        }
                    }
                }

                // Fetch Referral Link
                if let Ok(res) = client.get(format!("{}/referrals/me", base_url))
                    .header("Authorization", format!("Bearer {}", token))
                    .send().await {
                    if let Ok(data) = res.json::<ReferralResponse>().await {
                        if data.success {
                            let _ = view.update(&mut cx, |this, cx| {
                                this.referral_link = data.referral_link;
                                cx.notify();
                            });
                        }
                    }
                }
            }).detach();

            pane
        });
        view
    }

    fn apply_code(&mut self, cx: &mut ViewContext<Self>) {
        if self.code_input.is_empty() { return; }
        
        let code = self.code_input.clone();
        self.status_message = Some("Applying...".to_string());
        cx.notify();

        cx.spawn(|view, mut cx| async move {
            let client = reqwest::Client::new();
            let base_url = "https://api.lazynext.com/api/v1";
            let token = "placeholder_desktop_token";

            let req_body = serde_json::json!({ "code": code });

            match client.post(format!("{}/promotions/apply", base_url))
                .header("Authorization", format!("Bearer {}", token))
                .json(&req_body)
                .send().await {
                Ok(res) => {
                    if let Ok(data) = res.json::<ApplyResponse>().await {
                        let _ = view.update(&mut cx, |this, cx| {
                            if data.success {
                                this.status_message = Some("Success!".to_string());
                                if let Some(discount) = data.discount_applied {
                                    this.balance += discount as f32 / 100.0;
                                }
                            } else {
                                this.status_message = Some(data.error.unwrap_or("Failed".to_string()));
                            }
                            this.code_input.clear();
                            cx.notify();
                        });
                    }
                }
                Err(_) => {
                    let _ = view.update(&mut cx, |this, cx| {
                        this.status_message = Some("Network error".to_string());
                        cx.notify();
                    });
                }
            }
        }).detach();
    }
}

impl Render for PromotionsPane {
    fn render(&mut self, cx: &mut ViewContext<Self>) -> impl IntoElement {
        let status = self.status_message.clone().unwrap_or_default();
        
        div()
            .flex()
            .flex_col()
            .p_8()
            .gap_4()
            .bg(rgb(0x1e1e1e))
            .text_color(rgb(0xffffff))
            .child(
                div()
                    .text_xl()
                    .font_weight(FontWeight::BOLD)
                    .child("Refer & Earn (Desktop Native)"),
            )
            .child(
                div()
                    .flex()
                    .flex_row()
                    .gap_6()
                    .child(
                        div()
                            .p_4()
                            .bg(rgb(0x2d2d2d))
                            .rounded_md()
                            .child(div().text_sm().child("Wallet Balance"))
                            .child(
                                div()
                                    .text_2xl()
                                    .font_weight(FontWeight::BOLD)
                                    .child(format!("${:.2}", self.balance)),
                            ),
                    )
            )
            .child(
                div()
                    .mt_4()
                    .flex()
                    .flex_col()
                    .gap_2()
                    .child(div().child("Your Referral Link:"))
                    .child(
                        div()
                            .p_2()
                            .bg(rgb(0x000000))
                            .rounded_sm()
                            .child(self.referral_link.clone()),
                    ),
            )
            .child(
                div()
                    .mt_4()
                    .flex()
                    .flex_col()
                    .gap_2()
                    .child(div().child("Apply Promo Code:"))
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .gap_2()
                            .child(
                                // GPUI text input is highly complex to implement from scratch in a simple pane,
                                // so we keep this simplified structural representation for the demo.
                                div()
                                    .p_2()
                                    .bg(rgb(0x000000))
                                    .rounded_sm()
                                    .w_64()
                                    .child(if self.code_input.is_empty() { "Enter code here... (Demo Mode)" } else { &self.code_input }), 
                            )
                            .child(
                                div()
                                    .p_2()
                                    .bg(rgb(0x3b82f6))
                                    .rounded_sm()
                                    .cursor_pointer()
                                    .on_mouse_down(MouseButton::Left, |_, cx| {
                                        // Demo action: hardcode a code and simulate apply since full text input needs `gpui::TextInput`
                                        cx.update_view(|this: &mut PromotionsPane, cx| {
                                            this.code_input = "SAVE20".to_string();
                                            this.apply_code(cx);
                                        });
                                    })
                                    .child("Apply"),
                            )
                    )
            )
            .child(
                div()
                    .text_sm()
                    .text_color(rgb(0x888888))
                    .child(status),
            )
    }
}
