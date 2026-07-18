/// Helper macro that converts rust-i18n's `t!()` output (`Cow<str>`) to
/// `&'static str` for GPUI compatibility. Translations are embedded at compile
/// time so `Cow::Borrowed` is always produced for valid keys.
#[macro_export]
macro_rules! tr {
    ($key:tt) => {{
        let translated = rust_i18n::t!($key);
        match translated {
            std::borrow::Cow::Borrowed(s) => s,
            std::borrow::Cow::Owned(_) => $key,
        }
    }};
}
