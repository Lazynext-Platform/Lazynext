/// Lazynext Internationalization Crate.
///
/// Provides comprehensive ISO 3166-1 country data, ISO 4217 currency
/// data, and locale-aware formatting utilities. This is the single source
/// of truth for all globalization logic across the Lazynext platform.
pub mod countries;
pub mod currencies;
pub mod format;

/// Represents a country with ISO 3166-1 alpha-2 code, name, and locale info.
#[derive(Debug, Clone, PartialEq)]
pub struct Country {
    pub code: &'static str,
    pub name: &'static str,
    pub native_name: &'static str,
    pub continent: &'static str,
    pub default_locale: &'static str,
    pub default_currency: &'static str,
    pub calling_code: &'static str,
    pub is_eu: bool,
}

/// Represents a currency with ISO 4217 code and formatting parameters.
#[derive(Debug, Clone, PartialEq)]
pub struct Currency {
    pub code: &'static str,
    pub numeric: u16,
    pub name: &'static str,
    pub symbol: &'static str,
    pub decimals: u8,
    pub symbol_before: bool,
}

impl Country {
    pub fn find_by_code(code: &str) -> Option<&'static Country> {
        countries::ALL_COUNTRIES
            .iter()
            .find(|c| c.code.eq_ignore_ascii_case(code))
    }

    pub fn find_by_name(name: &str) -> Option<&'static Country> {
        countries::ALL_COUNTRIES
            .iter()
            .find(|c| c.name.eq_ignore_ascii_case(name))
    }

    pub fn all() -> &'static [Country] {
        countries::ALL_COUNTRIES
    }
}

impl Currency {
    pub fn find_by_code(code: &str) -> Option<&'static Currency> {
        currencies::ALL_CURRENCIES
            .iter()
            .find(|c| c.code.eq_ignore_ascii_case(code))
    }

    pub fn all() -> &'static [Currency] {
        currencies::ALL_CURRENCIES
    }

    /// Format an amount in minor units (cents/satangs/etc) to a display string.
    pub fn format_minor(&self, amount: i64) -> String {
        let major = amount as f64 / 10_f64.powi(self.decimals as i32);
        let formatted = format!("{:.prec$}", major, prec = self.decimals as usize);
        if self.symbol_before {
            format!("{}{}", self.symbol, formatted)
        } else {
            format!("{} {}", formatted, self.symbol)
        }
    }

    /// Return the number of decimals for this currency (e.g. 2 for USD, 0 for JPY).
    pub fn minor_unit_exponent(&self) -> u8 {
        self.decimals
    }
}
