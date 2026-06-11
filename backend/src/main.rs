mod config;
mod routes;
mod handlers;
mod services;
mod models;
mod repositories;
mod state;

use state::AppState;

use axum::Router;
use routes::health_routes::health_routes;

use sqlx::PgPool;
use std::env;

#[tokio::main]
async fn main() {

    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize logging
    tracing_subscriber::fmt::init();

    // Read DATABASE_URL from environment
    let database_url =
        env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");

    // Create PostgreSQL connection pool
    let db =
        PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to PostgreSQL");

    println!("✅ PostgreSQL connected");

    // Shared HTTP client
    let http_client = reqwest::Client::new();

    // Shared application state
    let app_state = AppState {
        db,
        http_client,
    };

    // Build router
    let app = Router::new()
        .merge(health_routes())
        .with_state(app_state);

    // Start server
    let listener =
        tokio::net::TcpListener::bind(
            "0.0.0.0:8080"
        )
        .await
        .unwrap();

    println!("🚀 FinIntel Backend running on :8080");

    axum::serve(listener, app)
        .await
        .unwrap();
}
