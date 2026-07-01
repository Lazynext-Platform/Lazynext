//! PostgreSQL-backed CRDT state persistence for the collab server.
//!
//! Stores project collaboration states as JSONB documents in a
//! `collab_states` table, with upsert semantics on save and
//! optional fetch on load.

use serde_json::Value;
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::env;

/// Persistent store for project collaboration states.
pub struct DbStore {
    pool: PgPool,
}

impl DbStore {
    /// Create a new DbStore, connecting to PostgreSQL and ensuring
    /// the `collab_states` table exists.
    pub async fn new() -> Result<Self, sqlx::Error> {
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/lazynext".to_string());

        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .connect(&database_url)
            .await?;

        // Ensure the table exists
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS collab_states (
                project_id VARCHAR(255) PRIMARY KEY,
                state JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );",
        )
        .execute(&pool)
        .await?;

        Ok(DbStore { pool })
    }

    /// Insert or update the collaboration state for a project (upsert on project_id).
    pub async fn save_state(&self, project_id: &str, state: &Value) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO collab_states (project_id, state) 
             VALUES ($1, $2) 
             ON CONFLICT (project_id) 
             DO UPDATE SET state = $2, updated_at = CURRENT_TIMESTAMP;",
        )
        .bind(project_id)
        .bind(state)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Load the collaboration state for a project, returning None if not found.
    pub async fn load_state(&self, project_id: &str) -> Result<Option<Value>, sqlx::Error> {
        use sqlx::Row;
        let row = sqlx::query("SELECT state FROM collab_states WHERE project_id = $1")
            .bind(project_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| r.get("state")))
    }
}
