use axum::{
    routing::get,
    Router,
};

use crate::handlers::health_handler::{
    health,
    test_ocr,
    services_health,
};

pub fn health_routes() -> Router {

    Router::new()
        .route("/health", get(health))
        .route("/test-ocr", get(test_ocr))
        .route(
            "/services/health",
            get(services_health)
        )
}