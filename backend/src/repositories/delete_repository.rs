//! Destructive operations: remove a single statement (cascade) or clear the
//! whole database. Neither `transactions`/`jobs` nor `entities`/`risk_profiles`
//! declare ON DELETE CASCADE, so children are removed explicitly and in FK-safe
//! order inside one transaction.
//!
//! `entities` are global (UNIQUE identifier, no statement_id) — they are resolved
//! across statements — so a single-statement delete only removes entities that are
//! now *orphaned* (their identifier no longer appears in any remaining transaction
//! or statement holder account).
//!
//! Any whole-network aggregate cached in `analysis_cache` is invalidated on every
//! mutation so the next read recomputes across the current statement set.

use sqlx::PgPool;

use crate::api::AppError;

/// Orphan-entity predicate (shared by the single-statement delete). Expects the
/// `entities` row aliased as `e`.
const ORPHAN_ENTITY_PREDICATE: &str = r#"
    WHERE e.identifier IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.sender_account   = e.identifier
             OR t.receiver_account = e.identifier
             OR t.upi_id           = e.identifier
      )
      AND NOT EXISTS (
          SELECT 1 FROM statements s WHERE s.account_number = e.identifier
      )
"#;

/// Delete a statement and everything derived from it.
/// Returns `(existed, transactions_removed, entities_removed)`.
pub async fn delete_statement_cascade(
    db: &PgPool,
    id: &str,
) -> Result<(bool, i64, i64), AppError> {
    let exists: Option<(String,)> =
        sqlx::query_as("SELECT id::text FROM statements WHERE id = $1::uuid")
            .bind(id)
            .fetch_optional(db)
            .await?;
    if exists.is_none() {
        return Ok((false, 0, 0));
    }

    let mut tx = db.begin().await?;

    let txns_removed: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE statement_id = $1::uuid")
            .bind(id)
            .fetch_one(&mut *tx)
            .await?;

    sqlx::query("DELETE FROM transactions WHERE statement_id = $1::uuid")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM alerts WHERE statement_id = $1::uuid")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM jobs WHERE statement_id = $1::uuid")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM statements WHERE id = $1::uuid")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Remove risk_profiles for entities about to be orphaned (FK safety), then
    // the orphaned entities themselves.
    sqlx::query(&format!(
        "DELETE FROM risk_profiles WHERE entity_id IN \
         (SELECT e.id FROM entities e {})",
        ORPHAN_ENTITY_PREDICATE
    ))
    .execute(&mut *tx)
    .await?;

    let ent_res = sqlx::query(&format!("DELETE FROM entities e {}", ORPHAN_ENTITY_PREDICATE))
        .execute(&mut *tx)
        .await?;
    let entities_removed = ent_res.rows_affected() as i64;

    // Whole-network aggregates no longer reflect reality.
    sqlx::query("DELETE FROM analysis_cache")
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok((true, txns_removed, entities_removed))
}

/// Clear every statement and all derived data.
/// Returns `(statements_removed, transactions_removed, entities_removed)`.
pub async fn clear_all(db: &PgPool) -> Result<(i64, i64, i64), AppError> {
    let statements: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM statements")
        .fetch_one(db)
        .await?;
    let transactions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
        .fetch_one(db)
        .await?;
    let entities: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM entities")
        .fetch_one(db)
        .await?;

    let mut tx = db.begin().await?;
    // children first (FK order), then parents, then independent caches
    sqlx::query("DELETE FROM transactions").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM alerts").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM jobs").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM risk_profiles").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM entities").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM statements").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM analysis_cache").execute(&mut *tx).await?;
    tx.commit().await?;

    Ok((statements, transactions, entities))
}

/// Invalidate all cached analysis so the next request recomputes across the
/// current statement set. Best-effort (used from the ingestion worker).
pub async fn clear_analysis_cache(db: &PgPool) -> Result<(), AppError> {
    sqlx::query("DELETE FROM analysis_cache").execute(db).await?;
    Ok(())
}
