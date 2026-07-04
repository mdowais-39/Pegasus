use axum::{
    body::Body,
    extract::{Path, State},
    http::header,
    response::Response,
    Json,
};
use serde_json::{json, Value};

use crate::{
    api::{ApiResponse, ApiResult, AppError},
    repositories::read_repository,
    services::proxy::{fetch_bytes, get_json, post_json},
    state::app_state::AppState,
};

fn enc(seg: &str) -> String {
    seg.replace(' ', "%20").replace('#', "%23").replace('?', "%3F")
}

/// GET /api/v1/cases/{case_id}/summary  — dashboard payload.
/// `case_id == "all"` aggregates the whole network; a statement UUID scopes the
/// counts, top risks and money-flow summary to that statement alone.
pub async fn case_summary(
    State(state): State<AppState>,
    Path(case_id): Path<String>,
) -> ApiResult<Value> {
    let g = &state.services.graph;
    let whole_network = case_id == "all";

    let mut summary = if whole_network {
        read_repository::case_summary(&state.db).await?
    } else {
        read_repository::case_summary_for_statement(&state.db, &case_id).await?
    };

    let (risk_url, flow_url) = if whole_network {
        (
            format!("{}/risk/top/representative?limit=5", g),
            format!("{}/flow/money-flow/all", g),
        )
    } else {
        (
            format!("{}/risk/top/statement/{}?limit=5", g, enc(&case_id)),
            format!("{}/flow/analyze/statement/{}", g, enc(&case_id)),
        )
    };

    if let Ok(top) = get_json(&state.http_client, &risk_url).await {
        if let Value::Object(ref mut m) = summary {
            m.insert("top_risks".into(),
                     top.get("top_risks").cloned().unwrap_or(json!([])));
        }
    }
    if let Ok(mf) = get_json(&state.http_client, &flow_url).await {
        if let Value::Object(ref mut m) = summary {
            m.insert("money_flow_summary".into(),
                     mf.get("summary").cloned().unwrap_or(Value::Null));
        }
    }
    Ok(ApiResponse::success(summary))
}

/// GET /api/v1/reports/{case_id}/json  — machine-readable report (enveloped)
pub async fn report_json(
    State(state): State<AppState>,
    Path(case_id): Path<String>,
) -> ApiResult<Value> {
    let url = format!("{}/report/{}/json", state.services.report, case_id);
    let data = get_json(&state.http_client, &url).await?;
    Ok(ApiResponse::success(data))
}

async fn download(
    state: &AppState,
    case_id: &str,
    fmt: &str,
) -> Result<Response, AppError> {
    let url = format!("{}/report/{}/{}", state.services.report, case_id, fmt);
    let (content_type, disposition, bytes) = fetch_bytes(&state.http_client, &url).await?;
    let mut builder = Response::builder()
        .status(200)
        .header(header::CONTENT_TYPE, content_type);
    if let Some(d) = disposition {
        builder = builder.header(header::CONTENT_DISPOSITION, d);
    }
    builder
        .body(Body::from(bytes))
        .map_err(|e| AppError::Internal(format!("response build error: {}", e)))
}

/// GET /api/v1/reports/{case_id}/pdf
pub async fn report_pdf(
    State(state): State<AppState>,
    Path(case_id): Path<String>,
) -> Result<Response, AppError> {
    download(&state, &case_id, "pdf").await
}

/// POST /api/v1/reports/{case_id}/email
/// Body: { recipients: [..], format?, subject?, message?, sender_name? }
/// Builds the report on the report service and emails it as an attachment.
pub async fn report_email(
    State(state): State<AppState>,
    Path(case_id): Path<String>,
    Json(body): Json<Value>,
) -> ApiResult<Value> {
    let url = format!("{}/report/{}/email", state.services.report, case_id);
    let data = post_json(&state.http_client, &url, &body).await?;
    Ok(ApiResponse::success(data))
}

/// GET /api/v1/reports/{case_id}/excel
pub async fn report_excel(
    State(state): State<AppState>,
    Path(case_id): Path<String>,
) -> Result<Response, AppError> {
    download(&state, &case_id, "excel").await
}

/// GET /api/v1/reports/{case_id}/docx
pub async fn report_docx(
    State(state): State<AppState>,
    Path(case_id): Path<String>,
) -> Result<Response, AppError> {
    download(&state, &case_id, "docx").await
}
