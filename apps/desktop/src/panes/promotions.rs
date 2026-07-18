use gpui::*;

pub struct PromotionsPane {
    balance: f32,
    referral_link: String,
    code_input: String,
}

impl PromotionsPane {
    pub fn new(cx: &mut WindowContext) -> View<Self> {
        cx.new_view(|_cx| Self {
            balance: 50.00,
            referral_link: "https://lazynext.com/ref/desktop_user".to_string(),
            code_input: "".to_string(),
        })
    }
}

impl Render for PromotionsPane {
    fn render(&mut self, cx: &mut ViewContext<Self>) -> impl IntoElement {
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
                                div()
                                    .p_2()
                                    .bg(rgb(0x000000))
                                    .rounded_sm()
                                    .w_64()
                                    .child("Enter code here..."), // Placeholder for input
                            )
                            .child(
                                div()
                                    .p_2()
                                    .bg(rgb(0x3b82f6))
                                    .rounded_sm()
                                    .cursor_pointer()
                                    .child("Apply"),
                            )
                    )
            )
    }
}
