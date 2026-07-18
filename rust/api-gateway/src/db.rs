//! Database models and PostgreSQL store for the API gateway.
//!
//! Defines structs mirroring the Drizzle schema (users, projects,
//! subscriptions), a `DbStore` with connection pooling and CRUD methods,
//! credit deduction, and presigned upload URL generation.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::postgres::{PgPool, PgPoolOptions};

/// Mirrors the Drizzle `user` table from `apps/web/src/db/schema.ts`.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    /// Unique user identifier.
    pub id: String,
    /// Email address used for authentication and notifications.
    pub email: String,
    /// Display name of the user.
    pub name: String,
    /// Whether the user's email has been verified.
    pub email_verified: bool,
    /// Avatar image URL, if any.
    pub image: Option<String>,
    /// User role for RBAC (e.g. "user", "admin").
    pub role: String,
    /// Dodo Payments customer ID for subscriptions.
    pub dodo_customer_id: Option<String>,
    /// Remaining AI credits balance.
    pub ai_credits: i32,
    /// Timestamp of user record creation.
    pub created_at: DateTime<Utc>,
    /// Timestamp of last user record update.
    pub updated_at: DateTime<Utc>,
}

/// Mirrors the Drizzle `projects` table.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    /// Unique project identifier.
    pub id: String,
    /// Owner user ID, if assigned.
    pub user_id: Option<String>,
    /// Human-readable project name.
    pub name: String,
    /// Frames per second for the project timeline.
    pub fps: i32,
    /// Canvas width in pixels.
    pub width: i32,
    /// Canvas height in pixels.
    pub height: i32,
    /// Total duration of the project in frames.
    pub duration_frames: i32,
    /// Serialized project data (tracks, clips, keyframes).
    pub data: Option<serde_json::Value>,
    /// Timestamp of project creation.
    pub created_at: DateTime<Utc>,
    /// Timestamp of last project update.
    pub updated_at: DateTime<Utc>,
}

/// Mirrors the Drizzle `subscriptions` table.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Subscription {
    /// Unique subscription identifier.
    pub id: String,
    /// User ID that owns this subscription.
    pub user_id: String,
    /// Dodo Payments subscription identifier.
    pub dodo_subscription_id: String,
    /// Dodo Payments price plan identifier.
    pub dodo_price_id: String,
    /// UTC timestamp when the current billing period ends.
    pub dodo_current_period_end: DateTime<Utc>,
    /// Subscription tier (e.g. "free", "pro").
    pub tier: String,
    /// Timestamp of subscription creation.
    pub created_at: DateTime<Utc>,
    /// Timestamp of last subscription update.
    pub updated_at: DateTime<Utc>,
}

/// Mirrors the Drizzle `user_social_tokens` table.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserSocialToken {
    /// Unique token record identifier.
    pub id: String,
    /// User ID that owns this token.
    pub user_id: String,
    /// Social platform identifier (e.g. "youtube", "tiktok", "instagram", "twitter").
    pub platform: String,
    /// OAuth access token.
    pub access_token: String,
    /// OAuth refresh token (if provided).
    pub refresh_token: Option<String>,
    /// Expiration timestamp for the access token.
    pub expires_at: Option<DateTime<Utc>>,
    /// Timestamp of record creation.
    pub created_at: DateTime<Utc>,
    /// Timestamp of last record update.
    pub updated_at: DateTime<Utc>,
}

/// Lightweight metrics row returned by admin dashboard queries.
#[derive(Debug, Serialize, Deserialize)]
pub struct AdminMetrics {
    /// Total number of registered users.
    pub total_users: i64,
    /// Number of active paid subscriptions.
    pub active_subscriptions: i64,
    /// Monthly recurring revenue in cents.
    pub monthly_recurring_revenue: i64,
}

/// PostgreSQL-backed data store with connection pooling, CRUD operations, and dev-mode fallback.
#[derive(Clone)]
pub struct DbStore {
    /// Connection pool, absent when running in dev mode.
    pool: Option<PgPool>,
    /// Whether the store is running without a database.
    is_dev_mode: bool,
}

impl DbStore {
    /// Create a new database store connected to PostgreSQL.
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await?;
        tracing::info!("Connected to PostgreSQL database");
        Ok(Self {
            pool: Some(pool),
            is_dev_mode: false,
        })
    }

    /// Create a development-mode store with no database.
    pub fn new_dev() -> Self {
        tracing::warn!("Starting in development mode — database features disabled");
        Self {
            pool: None,
            is_dev_mode: true,
        }
    }

    /// Returns `true` if a database connection pool is configured.
    pub fn has_db(&self) -> bool {
        self.pool.is_some()
    }
    /// Returns `true` if running in dev mode without a database.
    pub fn is_dev(&self) -> bool {
        self.is_dev_mode
    }

    /// Returns a reference to the connection pool, or an error if in dev mode.
    pub fn pool_ref(&self) -> Result<&PgPool, sqlx::Error> {
        self.pool
            .as_ref()
            .ok_or_else(|| sqlx::Error::Protocol("No database — running in dev mode".into()))
    }

    /// Executes a `SELECT 1` health check against the database.
    pub async fn health_check(&self) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT 1").execute(self.pool_ref()?).await?;
        Ok(())
    }

    /// Fetches a user by ID. Returns `None` if not found.
    pub async fn get_user(&self, user_id: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM \"user\" WHERE id = $1")
            .bind(user_id)
            .fetch_optional(self.pool_ref()?)
            .await
    }

    /// Upsert a user record (used when a new user authenticates via the web
    /// app and the gateway needs to cache their profile).
    pub async fn upsert_user(&self, user: &User) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO \"user\" (id, email, name, email_verified, image, role, dodo_customer_id, ai_credits, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               name = EXCLUDED.name,
               email_verified = EXCLUDED.email_verified,
               image = EXCLUDED.image,
               role = EXCLUDED.role,
               dodo_customer_id = EXCLUDED.dodo_customer_id,
               ai_credits = EXCLUDED.ai_credits,
               updated_at = EXCLUDED.updated_at",
        )
        .bind(&user.id)
        .bind(&user.email)
        .bind(&user.name)
        .bind(user.email_verified)
        .bind(&user.image)
        .bind(&user.role)
        .bind(&user.dodo_customer_id)
        .bind(user.ai_credits)
        .bind(user.created_at)
        .bind(user.updated_at)
        .execute(self.pool_ref()?)
        .await?;
        Ok(())
    }

    /// Fetch admin dashboard metrics.
    pub async fn get_admin_metrics(&self) -> Result<AdminMetrics, sqlx::Error> {
        let total_users: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM \"user\"")
            .fetch_one(self.pool_ref()?)
            .await?;

        let active_subs: (i64,) =
            sqlx::query_as("SELECT COUNT(*)::bigint FROM subscriptions WHERE tier != 'free'")
                .fetch_one(self.pool_ref()?)
                .await?;

        // Monthly revenue: all paid tiers at $29/mo (simplified).
        Ok(AdminMetrics {
            total_users: total_users.0,
            active_subscriptions: active_subs.0,
            monthly_recurring_revenue: active_subs.0 * 29,
        })
    }

    /// Fetch all projects belonging to a user.
    pub async fn get_projects_for_user(&self, user_id: &str) -> Result<Vec<Project>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC")
            .bind(user_id)
            .fetch_all(self.pool_ref()?)
            .await
    }

    /// Get a subscription for a given user.
    pub async fn get_subscription_for_user(
        &self,
        user_id: &str,
    ) -> Result<Option<Subscription>, sqlx::Error> {
        sqlx::query_as(
            "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(self.pool_ref()?)
        .await
    }

    /// Update (or create) a subscription record after a Dodo Payments webhook.
    pub async fn upsert_subscription(&self, sub: &Subscription) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO subscriptions (id, user_id, dodo_subscription_id, dodo_price_id, dodo_current_period_end, tier, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               dodo_price_id = EXCLUDED.dodo_price_id,
               dodo_current_period_end = EXCLUDED.dodo_current_period_end,
               tier = EXCLUDED.tier,
               updated_at = EXCLUDED.updated_at",
        )
        .bind(&sub.id)
        .bind(&sub.user_id)
        .bind(&sub.dodo_subscription_id)
        .bind(&sub.dodo_price_id)
        .bind(sub.dodo_current_period_end)
        .bind(&sub.tier)
        .bind(sub.created_at)
        .bind(sub.updated_at)
        .execute(self.pool_ref()?)
        .await?;
        Ok(())
    }

    /// Updates the project data blob and `updated_at` timestamp.
    pub async fn update_project_data(
        &self,
        project_id: &str,
        data: &serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE projects SET data = $1, updated_at = NOW() WHERE id = $2")
            .bind(data)
            .bind(project_id)
            .execute(self.pool_ref()?)
            .await?;
        Ok(())
    }

    /// Fetches a user's social token for a specific platform.
    pub async fn get_social_token(
        &self,
        user_id: &str,
        platform: &str,
    ) -> Result<Option<UserSocialToken>, sqlx::Error> {
        if self.is_dev_mode {
            return Ok(None);
        }
        let pool = self.pool.as_ref().unwrap();
        let token = sqlx::query_as::<_, UserSocialToken>(
            "SELECT * FROM user_social_tokens WHERE user_id = $1 AND platform = $2",
        )
        .bind(user_id)
        .bind(platform)
        .fetch_optional(pool)
        .await?;
        Ok(token)
    }

    /// Upserts a social token.
    pub async fn upsert_social_token(&self, token: &UserSocialToken) -> Result<(), sqlx::Error> {
        if self.is_dev_mode {
            return Ok(());
        }
        let pool = self.pool.as_ref().unwrap();
        sqlx::query(
            r#"
            INSERT INTO user_social_tokens (id, user_id, platform, access_token, refresh_token, expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id, platform) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = COALESCE(EXCLUDED.refresh_token, user_social_tokens.refresh_token),
                expires_at = EXCLUDED.expires_at,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(&token.id)
        .bind(&token.user_id)
        .bind(&token.platform)
        .bind(&token.access_token)
        .bind(&token.refresh_token)
        .bind(token.expires_at)
        .bind(token.created_at)
        .bind(token.updated_at)
        .execute(pool)
        .await?;
        Ok(())
    }

    /// Deduct AI credits from a user. Returns the new balance.
    pub async fn deduct_credits(&self, user_id: &str, amount: i32) -> Result<i32, sqlx::Error> {
        let row: (i32,) = sqlx::query_as(
            "UPDATE \"user\" SET ai_credits = ai_credits - $2 WHERE id = $1 RETURNING ai_credits",
        )
        .bind(user_id)
        .bind(amount)
        .fetch_one(self.pool_ref()?)
        .await?;

        Ok(row.0)
    }
}

/// Generate a presigned upload URL for media storage.
///
/// On Linode, uses local filesystem storage. Returns a direct API endpoint
/// URL for chunked upload. No cloud blob storage dependency.
pub async fn generate_blob_sas_url(
    _account: &str,
    _container: &str,
    blob_name: &str,
) -> Result<String, String> {
    let _media_dir =
        std::env::var("MEDIA_DIR").unwrap_or_else(|_| "/opt/lazynext/media".to_string());
    Ok(format!(
        "{}/api/v1/upload/{}",
        std::env::var("API_GATEWAY_URL").unwrap_or_else(|_| "https://api.lazynext.com".to_string()),
        blob_name
    ))
}
