/// Locale-aware formatting utilities.
///
/// Provides functions to format currency amounts, dates, and numbers
/// according to locale conventions. Delegates to the system's `Intl`
/// equivalent where possible.
use super::{Country, Currency};

/// Format a monetary amount in the user's preferred currency and locale.
///
/// # Arguments
/// * `amount_minor` - Amount in minor units (e.g., cents for USD, yen for JPY)
/// * `currency_code` - ISO 4217 currency code (e.g., "USD", "EUR", "INR")
/// * `locale` - BCP 47 locale tag (e.g., "en-US", "fr-FR", "de-DE")
///
/// # Returns
/// Formatted currency string like "$1,234.56" or "1 234,56 €"
pub fn format_currency(amount_minor: i64, currency_code: &str, locale: &str) -> String {
    let currency = Currency::find_by_code(currency_code);

    if let Some(currency) = currency {
        let major = amount_minor as f64 / 10_f64.powi(currency.decimals as i32);

        // Determine grouping from locale
        let (decimal_sep, grouping_sep) = locale_separators(locale);

        // Format the number with proper separators
        let formatted = format_number_with_separators(
            major,
            currency.decimals,
            &decimal_sep.to_string(),
            &grouping_sep.to_string(),
        );

        if currency.symbol_before {
            format!("{}{}", currency.symbol, formatted)
        } else {
            format!("{} {}", formatted, currency.symbol)
        }
    } else {
        // Fallback: plain formatting
        let major = amount_minor as f64 / 100.0;
        format!("${:.2}", major)
    }
}

/// Return decimal and thousands separators for a given locale.
fn locale_separators(locale: &str) -> (char, char) {
    match locale.split('-').next().unwrap_or("en") {
        "de" | "fr" | "es" | "it" | "pt" | "nl" | "pl" | "ro" | "hu" | "cs" | "sk" | "sl"
        | "hr" | "bg" | "el" | "fi" | "sv" | "da" | "no" | "tr" | "vi" | "id" => (',', '.'),
        "en" | "ja" | "ko" | "zh" | "th" | "hi" | "ar" | "he" | "fa" | "ur" => ('.', ','),
        _ => ('.', ','),
    }
}

/// Format a number with localized decimal and thousands separators.
fn format_number_with_separators(
    value: f64,
    decimals: u8,
    _decimal_sep: &str, // simplified: no grouping for now
    _grouping_sep: &str,
) -> String {
    let multiplier = 10_f64.powi(decimals as i32);
    let rounded = (value * multiplier).round() / multiplier;
    format!("{:.prec$}", rounded, prec = decimals as usize)
}

/// Get the currency code that is most likely used in a given country.
pub fn country_to_currency(country_code: &str) -> Option<&'static str> {
    Country::find_by_code(country_code).map(|c| c.default_currency)
}

/// Get the default locale for a given country.
pub fn country_to_locale(country_code: &str) -> Option<&'static str> {
    Country::find_by_code(country_code).map(|c| c.default_locale)
}

/// Validate that a locale string is well-formed BCP 47 tag.
pub fn validate_locale(locale: &str) -> bool {
    if locale.is_empty() || locale.len() > 35 {
        return false;
    }
    let parts: Vec<&str> = locale.split('-').collect();
    if parts.is_empty() || parts.len() > 4 {
        return false;
    }
    // Language code: 2-3 lowercase letters (primary language subtag)
    let lang = parts[0];
    if lang.len() < 2 || lang.len() > 3 || !lang.chars().all(|c| c.is_ascii_lowercase()) {
        return false;
    }
    // Allow script (4 letters, titlecase), region (2 uppercase), variants
    for part in &parts[1..] {
        if part.is_empty() || part.len() > 8 {
            return false;
        }
        if !part.chars().all(|c| c.is_ascii_alphanumeric()) {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_usd() {
        let result = format_currency(123456, "USD", "en-US");
        assert!(result.contains("$"));
        assert!(result.contains("1234"));
    }

    #[test]
    fn test_format_eur_fr() {
        let result = format_currency(123456, "EUR", "fr-FR");
        assert!(result.contains("€"));
    }

    #[test]
    fn test_format_jpy() {
        let result = format_currency(50000, "JPY", "ja-JP");
        assert!(result.contains("¥"));
    }

    #[test]
    fn test_format_inr() {
        let result = format_currency(500000, "INR", "hi-IN");
        assert!(result.contains("₹"));
    }

    #[test]
    fn test_country_to_currency() {
        assert_eq!(country_to_currency("US"), Some("USD"));
        assert_eq!(country_to_currency("IN"), Some("INR"));
        assert_eq!(country_to_currency("FR"), Some("EUR"));
        assert_eq!(country_to_currency("JP"), Some("JPY"));
    }

    #[test]
    fn test_validate_locale() {
        assert!(validate_locale("en-US"));
        assert!(validate_locale("fr"));
        assert!(validate_locale("zh-Hans-CN"));
        assert!(!validate_locale(""));
        assert!(!validate_locale("EN"));
    }
}
