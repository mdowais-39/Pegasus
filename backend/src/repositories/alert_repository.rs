//! Investigator alerts: created by the ingestion worker when a statement yields
//! serious findings, read by the nav bell / alerts panel, acknowledged by the
//! officer. Cascade-cleaned when a statement (or the whole DB) is deleted.

use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::api::AppError;

#[allow(clippy::too_many_arguments)]
pub async fn insert_alert(
    db: &PgPool,
    statement_id: Uuid,
    account: Option<&str>,
    severity: &str,
    category: &str,
    title: &str,
    detail: &str,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO alerts (statement_id, account, severity, category, title, detail)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(statement_id)
    .bind(account)
    .bind(severity)
    .bind(category)
    .bind(title)
    .bind(detail)
    .execute(db)
    .await?;
    Ok(())
}

pub async fn list_alerts(
    db: &PgPool,
    only_unacknowledged: bool,
    limit: i64,
) -> Result<Vec<Value>, AppError> {
    let sql = if only_unacknowledged {
        r#"SELECT id::text AS id, statement_id::text AS statement_id, account,
                  severity, category, title, detail,
                  created_at::text AS created_at, acknowledged
           FROM alerts WHERE acknowledged = false
           ORDER BY created_at DESC LIMIT $1"#
    } else {
        r#"SELECT id::text AS id, statement_id::text AS statement_id, account,
                  severity, category, title, detail,
                  created_at::text AS created_at, acknowledged
           FROM alerts ORDER BY created_at DESC LIMIT $1"#
    };

    let rows = sqlx::query(sql).bind(limit).fetch_all(db).await?;
    Ok(rows
        .iter()
        .map(|r| {
            json!({
                "id": r.get::<String, _>("id"),
                "statement_id": r.get::<Option<String>, _>("statement_id"),
                "account": r.get::<Option<String>, _>("account"),
                "severity": r.get::<String, _>("severity"),
                "category": r.get::<Option<String>, _>("category"),
                "title": r.get::<String, _>("title"),
                "detail": r.get::<Option<String>, _>("detail"),
                "created_at": r.get::<Option<String>, _>("created_at"),
                "acknowledged": r.get::<bool, _>("acknowledged"),
            })
        })
        .collect())
}

pub async fn count_unacknowledged(db: &PgPool) -> Result<i64, AppError> {
    let row = sqlx::query("SELECT COUNT(*) AS c FROM alerts WHERE acknowledged = false")
        .fetch_one(db)
        .await?;
    Ok(row.get::<i64, _>("c"))
}

/// Alerts created for a specific statement (used to drive the completion toast).
pub async fn count_for_statement(db: &PgPool, statement_id: &str) -> Result<i64, AppError> {
    let row = sqlx::query("SELECT COUNT(*) AS c FROM alerts WHERE statement_id = $1::uuid")
        .bind(statement_id)
        .fetch_one(db)
        .await?;
    Ok(row.get::<i64, _>("c"))
}

pub async fn acknowledge(db: &PgPool, id: &str) -> Result<bool, AppError> {
    let res = sqlx::query("UPDATE alerts SET acknowledged = true WHERE id = $1::uuid")
        .bind(id)
        .execute(db)
        .await?;
    Ok(res.rows_affected() > 0)
}
