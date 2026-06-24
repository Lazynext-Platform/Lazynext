use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::postgres::{PgPool, PgPoolOptions};

/// Mirrors the Drizzle `user` table from `apps/web/src/db/schema.ts`.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
    pub email_verified: bool,
    pub image: Option<String>,
    pub role: String,
    pub stripe_customer_id: Option<String>,
    pub ai_credits: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Mirrors the Drizzle `projects` table.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub user_id: Option<String>,
    pub name: String,
    pub fps: i32,
    pub width: i32,
    pub height: i32,
    pub duration_frames: i32,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Mirrors the Drizzle `subscriptions` table.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Subscription {
    pub id: String,
    pub user_id: String,
    pub stripe_subscription_id: String,
    pub stripe_price_id: String,
    pub stripe_current_period_end: DateTime<Utc>,
    pub tier: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Lightweight metrics row returned by admin dashboard queries.
#[derive(Debug, Serialize, Deserialize)]
pub struct AdminMetrics {
    pub total_users: i64,
    pub active_subscriptions: i64,
    pub monthly_recurring_revenue: i64,
}

#[derive(Clone)]
pub struct DbStore {
    pub pool: PgPool,
}

impl DbStore {
    /// Create a new database store connected to PostgreSQL.
    ///
    /// `DATABASE_URL` must be set to a valid PostgreSQL connection string,
    /// e.g. `postgresql://lazynext:password@localhost:5432/lazynext`.
    /// Falls back to the standard Docker Compose connection for local dev.
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await?;

        tracing::info!("Connected to PostgreSQL database");
        Ok(Self { pool })
    }

    /// Fetch a user by ID. Returns `None` if the user doesn't exist.
    pub async fn get_user(&self, user_id: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM \"user\" WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
    }

    /// Upsert a user record (used when a new user authenticates via the web
    /// app and the gateway needs to cache their profile).
    pub async fn upsert_user(&self, user: &User) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO \"user\" (id, email, name, email_verified, image, role, stripe_customer_id, ai_credits, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               name = EXCLUDED.name,
               email_verified = EXCLUDED.email_verified,
               image = EXCLUDED.image,
               role = EXCLUDED.role,
               stripe_customer_id = EXCLUDED.stripe_customer_id,
               ai_credits = EXCLUDED.ai_credits,
               updated_at = EXCLUDED.updated_at",
        )
        .bind(&user.id)
        .bind(&user.email)
        .bind(&user.name)
        .bind(user.email_verified)
        .bind(&user.image)
        .bind(&user.role)
        .bind(&user.stripe_customer_id)
        .bind(user.ai_credits)
        .bind(user.created_at)
        .bind(user.updated_at)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Fetch admin dashboard metrics.
    pub async fn get_admin_metrics(&self) -> Result<AdminMetrics, sqlx::Error> {
        let total_users: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM \"user\"")
            .fetch_one(&self.pool)
            .await?;

        let active_subs: (i64,) =
            sqlx::query_as("SELECT COUNT(*)::bigint FROM subscriptions WHERE tier != 'free'")
                .fetch_one(&self.pool)
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
            .fetch_all(&self.pool)
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
        .fetch_optional(&self.pool)
        .await
    }

    /// Update (or create) a subscription record after a Stripe webhook.
    pub async fn upsert_subscription(&self, sub: &Subscription) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, stripe_current_period_end, tier, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               stripe_price_id = EXCLUDED.stripe_price_id,
               stripe_current_period_end = EXCLUDED.stripe_current_period_end,
               tier = EXCLUDED.tier,
               updated_at = EXCLUDED.updated_at",
        )
        .bind(&sub.id)
        .bind(&sub.user_id)
        .bind(&sub.stripe_subscription_id)
        .bind(&sub.stripe_price_id)
        .bind(sub.stripe_current_period_end)
        .bind(&sub.tier)
        .bind(sub.created_at)
        .bind(sub.updated_at)
        .execute(&self.pool)
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
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }
}
