/// Internationalization API endpoints.
///
/// Handlers for country/currency lookups, locale-aware currency
/// formatting, and user locale preference management.

use axum::extract::{Json, State, Extension};
use axum::http::StatusCode;
use lazynext_international::{Country, Currency};
use lazynext_international::format as intl_fmt;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

#[derive(Deserialize)]
pub struct FormatCurrencyRequest {
    pub amount: i64,
    pub currency: Option<String>,
    pub locale: Option<String>,
}

#[derive(Serialize)]
pub struct CountryResponse {
    pub code: String,
    pub name: String,
    pub native_name: String,
    pub continent: String,
    pub default_locale: String,
    pub default_currency: String,
    pub calling_code: String,
    pub is_eu: bool,
}

#[derive(Serialize)]
pub struct CurrencyResponse {
    pub code: String,
    pub numeric: u16,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

/// GET /api/v1/international/countries
///
/// Returns the complete list of ISO 3166-1 countries.
pub async fn handle_get_countries() -> Json<Value> {
    let countries: Vec<CountryResponse> = Country::all()
        .iter()
        .map(|c| CountryResponse {
            code: c.code.to_string(),
            name: c.name.to_string(),
            native_name: c.native_name.to_string(),
            continent: c.continent.to_string(),
            default_locale: c.default_locale.to_string(),
            default_currency: c.default_currency.to_string(),
            calling_code: c.calling_code.to_string(),
            is_eu: c.is_eu,
        })
        .collect();
    Json(json!({ "countries": countries, "count": countries.len() }))
}

/// GET /api/v1/international/currencies
///
/// Returns the complete list of ISO 4217 currencies.
pub async fn handle_get_currencies() -> Json<Value> {
    let currencies: Vec<CurrencyResponse> = Currency::all()
        .iter()
        .map(|c| CurrencyResponse {
            code: c.code.to_string(),
            numeric: c.numeric,
            name: c.name.to_string(),
            symbol: c.symbol.to_string(),
            decimals: c.decimals,
        })
        .collect();
    Json(json!({ "currencies": currencies, "count": currencies.len() }))
}

/// POST /api/v1/international/format-currency
///
/// Formats a monetary amount according to the given currency and locale.
pub async fn handle_format_currency(
    Json(req): Json<FormatCurrencyRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let currency_code = req.currency.as_deref().unwrap_or("USD");
    let locale = req.locale.as_deref().unwrap_or("en-US");

    if Currency::find_by_code(currency_code).is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": format!("Unknown currency: {}", currency_code) })),
        ));
    }

    let formatted = intl_fmt::format_currency(req.amount, currency_code, locale);

    Ok(Json(json!({
        "amount": req.amount,
        "currency": currency_code,
        "locale": locale,
        "formatted": formatted,
    })))
}

/// PUT /api/v1/user/locale
///
/// Updates the authenticated user's locale, country, and currency preferences.
pub async fn handle_update_user_locale(
    State(state): State<AppState>,
    Extension(claims): Extension<crate::rbac::AuthClaims>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let user_id = claims.sub.clone();
    let locale = payload.get("locale").and_then(|v| v.as_str()).unwrap_or("en-US");
    let country = payload.get("country").and_then(|v| v.as_str()).unwrap_or("US");
    let currency = payload.get("currency").and_then(|v| v.as_str()).unwrap_or("USD");

    if !intl_fmt::validate_locale(locale) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": format!("Invalid locale: {}", locale) })),
        ));
    }

    let pool = state.db.pool_ref().map_err(|e| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": format!("Database unavailable: {}", e) })),
        )
    })?;

    let result = sqlx::query(
        "UPDATE \"user\" SET locale = $1, country = $2, currency = $3 WHERE id = $4",
    )
    .bind(locale)
    .bind(country)
    .bind(currency)
    .bind(&user_id)
    .execute(pool)
    .await;

    match result {
        Ok(_) => Ok(Json(json!({
            "status": "ok",
            "locale": locale,
            "country": country,
            "currency": currency,
        }))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("Failed to update preferences: {}", e) })),
        )),
    }
}
