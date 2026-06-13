use axum::{
    extract::{
        Multipart,
        Path,
        State,
    },
    Json,
};

use axum::http::StatusCode;

use uuid::Uuid;

use crate::{
    models::statement::{
        ProcessingJob,
        StatusResponse,
        UploadResponse,
    },
    repositories::statement::insert_statement,
    services::storage::create_statement_directory,
    state::app_state::AppState,
};

pub async fn upload_statement(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Json<UploadResponse> {

    let mut bank_name: Option<String> = None;

    let statement_id = Uuid::new_v4();
    let job_id = Uuid::new_v4();

    let mut filename = String::from("unknown");

    let mut saved_file_path: Option<std::path::PathBuf> = None;

    while let Some(field) =
        multipart
            .next_field()
            .await
            .expect(
                "Failed to read multipart field"
            )
    {

        if field.name() == Some("bank_name") {

            let value =
                field.text().await.expect(
                    "Failed to read bank name"
                );

            bank_name = Some(value);

            continue;
        }

        if field.name() == Some("file") {

            filename = field
                .file_name()
                .unwrap_or("statement")
                .to_string();

            let content_type = field
                .content_type()
                .unwrap_or("");

            let allowed_types = [
                "application/pdf",

                "text/csv",

                "application/vnd.ms-excel",

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                "image/png",

                "image/jpeg",
            ];

            if !allowed_types.contains(&content_type) {

                panic!(
                    "Unsupported file type: {}",
                    content_type
                );
            }

            let bytes = field
                .bytes()
                .await
                .expect(
                    "Failed to read uploaded file"
                );

            let directory =
                create_statement_directory(
                    statement_id
                )
                .await
                .expect(
                    "Failed to create statement directory"
                );

            let file_path =
                directory.join(&filename);

            tokio::fs::write(
                &file_path,
                bytes,
            )
            .await
            .expect(
                "Failed to save uploaded file"
            );

            saved_file_path = Some(file_path);
        }
    }

    let file_path =
        saved_file_path
            .expect("No file uploaded");

    insert_statement(
        &state.db,
        statement_id,
        filename.clone(),
        bank_name.clone(),
        file_path.to_string_lossy().to_string(),
    )
    .await
    .expect(
        "Failed to insert statement into database"
    );

    let job = ProcessingJob {
        job_id,
        statement_id,
        file_path: file_path
            .to_string_lossy()
            .to_string(),
    };

    state
        .job_sender
        .send(job)
        .await
        .expect(
            "Failed to enqueue processing job"
        );

    state
        .job_status
        .write()
        .await
        .insert(
            job_id,
            String::from("queued"),
        );

    Json(UploadResponse {
        job_id,
        statement_id,
        status: String::from("queued"),
    })
}


pub async fn get_status(
    Path(job_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Json<StatusResponse> {

    let status = state
        .job_status
        .read()
        .await
        .get(&job_id)
        .cloned()
        .unwrap_or_else(|| {
            String::from("unknown")
        });

    Json(StatusResponse {
        job_id,
        status,
        progress: 0,
        error: None,
    })
}