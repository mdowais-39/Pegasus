mod config;
mod routes;
mod handlers;
mod services;
mod models;
mod repositories;
mod state;

use std::{
    collections::HashMap,
    sync::Arc,
};

use axum::Router;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tokio::{
    sync::{
        mpsc,
        RwLock,
    },
};

use routes::{
    health_routes::health_routes,
    statement_routes::statement_routes,
};

use services::worker::start_worker;

use state::{
    app_state::AppState,
    job_status::JobStatusStore,
};

#[tokio::main]
async fn main() {
    // Load .env
    dotenv().ok();

    // Initialize logging
    tracing_subscriber::fmt::init();

    // Database URL
    let database_url =
        std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");

    // Create PostgreSQL pool
    let db = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    println!("PostgreSQL Connected");

    // Create queue
    let (job_sender, job_receiver) =
        mpsc::channel(100);

    // Create in-memory job status store
    let job_status: JobStatusStore =
        Arc::new(
            RwLock::new(HashMap::new())
        );

    // Start background worker
    tokio::spawn(start_worker(
        job_receiver,
        db.clone(),
    ));

    println!(" Background Worker Started");

    // Create application state
    let app_state = AppState {
        db,
        http_client: reqwest::Client::new(),
        job_sender,
        job_status,
    };

    // Build router
    let app = Router::new()
        .merge(health_routes())
        .merge(statement_routes())
        .with_state(app_state);

    // Start server
    let listener =
        tokio::net::TcpListener::bind(
            "0.0.0.0:8080"
        )
        .await
        .expect("Failed to bind to port 8080");

    println!(
        "FinIntel Backend running on http://localhost:8080"
    );

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}