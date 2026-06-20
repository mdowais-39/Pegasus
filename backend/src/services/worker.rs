use crate::{
    models::{
        statement::ProcessingJob,
        transaction::Transaction,
    },
    services::transaction_service::save_transactions,
};

use reqwest::Client;
use serde_json::Value;
use sqlx::PgPool;

pub async fn start_worker(
    mut receiver: tokio::sync::mpsc::Receiver<
        ProcessingJob,
    >,
    db: PgPool,
) {
    let client = Client::new();

    while let Some(job) =
        receiver.recv().await
    {
        println!(
            "\nProcessing statement: {}",
            job.statement_id
        );

        println!("Status: processing");

        println!(
            "Sending file path to OCR:\n{}",
            job.file_path
        );

        let absolute_path =
            std::fs::canonicalize(
                &job.file_path
            )
            .unwrap()
            .to_string_lossy()
            .to_string();

        let ocr_response = client
            .post(
                "http://localhost:8001/extract"
            )
            .json(&serde_json::json!({
                "file_path": absolute_path
            }))
            .send()
            .await;

        match ocr_response {

            Ok(resp) => {

                let ocr_json: Value =
                    match resp.json().await {

                        Ok(data) => data,

                        Err(err) => {

                            println!(
                                "Failed to parse OCR JSON: {}",
                                err
                            );

                            continue;
                        }
                    };

                println!(
                    "\n========== OCR OUTPUT ==========\n{}",
                    serde_json::to_string_pretty(
                        &ocr_json
                    )
                    .unwrap()
                );

                let standardize_response =
                    client
                        .post(
                            "http://localhost:8002/standardize"
                        )
                        .json(
                            &serde_json::json!({
                                "rows": ocr_json["rows"]
                            })
                        )
                        .send()
                        .await;

                match standardize_response {

                    Ok(resp) => {

                        let standardized_json: Value =
                            match resp.json().await {

                                Ok(data) => data,

                                Err(err) => {

                                    println!(
                                        "Failed to parse standardized JSON: {}",
                                        err
                                    );

                                    continue;
                                }
                            };

                        println!(
                            "\n========== STANDARDIZED OUTPUT ==========\n{}",
                            serde_json::to_string_pretty(
                                &standardized_json
                            )
                            .unwrap()
                        );

                        // --------------------------------
                        // Deserialize Transactions
                        // --------------------------------

                        let transactions:
                            Vec<Transaction> =

                            serde_json::from_value(
                                standardized_json[
                                    "transactions"
                                ]
                                .clone()
                            )
                            .unwrap_or_default();

                        println!(
                            "Parsed {} transactions",
                            transactions.len()
                        );

                        // --------------------------------
                        // Save Transactions
                        // --------------------------------

                        save_transactions(
                            &db,
                            job.statement_id,
                            transactions,
                        )
                        .await;

                        println!(
                            "Transactions saved successfully"
                        );

                        println!(
                            "\nStatus: completed"
                        );
                    }

                    Err(err) => {

                        println!(
                            "Standardizer Error: {}",
                            err
                        );
                    }
                }
            }

            Err(err) => {

                println!(
                    "OCR Service Error: {}",
                    err
                );
            }
        }
    }
}