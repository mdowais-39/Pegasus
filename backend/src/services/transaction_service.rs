use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    models::transaction::Transaction,

    repositories::
        transaction_repository::
            insert_transaction,
};

pub async fn save_transactions(

    pool: &PgPool,

    statement_id: Uuid,

    txns: Vec<Transaction>,

) {

    for txn in txns {

        let raw_row =
            serde_json::json!({});

        if let Err(err) =
            insert_transaction(
                pool,
                statement_id,
                &txn,
                raw_row,
            )
            .await
        {
            println!(
                "Transaction Save Error: {}",
                err
            );
        }
    }
}