use sqlx::{
    PgPool,
};
use uuid::Uuid;

use crate::models::transaction::Transaction;

pub async fn insert_transaction(

    pool: &PgPool,

    statement_id: Uuid,

    txn: &Transaction,

    raw_row: serde_json::Value,

) -> Result<(), sqlx::Error> {

    sqlx::query(
        r#"
        INSERT INTO transactions (

            id,
            statement_id,

            date,

            amount,

            txn_type,

            upi_id,

            narration,
            narration_normalized,

            balance,

            reference_number,
            debit_credit,
            platform,

            raw_row

        )

        VALUES (

            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,$11,
            $12,$13

        )
        "#
    )
    .bind(Uuid::new_v4())
    .bind(statement_id)

    .bind(&txn.date)

    .bind(txn.amount)

    .bind(&txn.txn_type)

    .bind(&txn.upi_id)

    .bind(&txn.narration)

    .bind(
        &txn.narration_normalized
    )

    .bind(txn.balance)

    .bind(
        &txn.reference_number
    )

    .bind(
        &txn.debit_credit
    )

    .bind(
        &txn.platform
    )

    .bind(raw_row)

    .execute(pool)
    .await?;

    Ok(())
}