use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    #[serde(skip_deserializing)]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub crdt_state: String,
    #[serde(skip_deserializing)]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_deserializing)]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Subscription {
    pub id: String,
    pub user_id: String,
    pub tier: String,
    pub stripe_customer_id: Option<String>,
    pub status: String,
}

#[derive(Clone)]
pub struct DbStore {
    pub pool: SqlitePool,
}

impl DbStore {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;
        
        // Ensure tables exist for our new Rust schema
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                title TEXT NOT NULL,
                crdt_state TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                tier TEXT NOT NULL,
                stripe_customer_id TEXT,
                status TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;

        Ok(Self { pool })
    }

    pub async fn get_admin_metrics(&self) -> Result<(i64, i64), sqlx::Error> {
        let total_users: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?;

        let active_subs: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM subscriptions WHERE tier = 'pro' AND status = 'active'")
            .fetch_one(&self.pool)
            .await?;

        Ok((total_users.0, active_subs.0))
    }

    pub async fn get_projects_for_user(&self, user_id: &str) -> Result<Vec<Project>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM projects WHERE user_id = ?")
            .bind(user_id)
            .fetch_all(&self.pool)
            .await
    }
}
