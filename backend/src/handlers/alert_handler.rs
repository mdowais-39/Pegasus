use axum::extract::{Path, Query, State};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::{
    api::{ApiResponse, ApiResult, AppError},
    repositories::alert_repository,
    state::app_state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct AlertQuery {
    #[serde(default)]
    pub unacknowledged: Option<bool>,
    #[serde(default)]
    pub limit: Option<i64>,
}

/// GET /api/v1/alerts?unacknowledged=true&limit=100
pub async fn list_alerts(
    State(state): State<AppState>,
    Query(q): Query<AlertQuery>,
) -> ApiResult<Vec<Value>> {
    let only_unack = q.unacknowledged.unwrap_or(false);
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    let alerts = alert_repository::list_alerts(&state.db, only_unack, limit).await?;
    Ok(ApiResponse::success(alerts))
}

/// GET /api/v1/alerts/count  — unread count for the nav bell
pub async fn alerts_count(State(state): State<AppState>) -> ApiResult<Value> {
    let n = alert_repository::count_unacknowledged(&state.db).await?;
    Ok(ApiResponse::success(json!({ "unacknowledged": n })))
}

/// POST /api/v1/alerts/{id}/ack
pub async fn ack_alert(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Value> {
    let ok = alert_repository::acknowledge(&state.db, &id).await?;
    if !ok {
        return Err(AppError::NotFound(format!("alert {} not found", id)));
    }
    Ok(ApiResponse::success(json!({ "acknowledged": true, "id": id })))
}
