mod config;
mod routes;
mod handlers;
mod services;
mod models;
mod repositories;
mod state;

use axum::Router;

use routes::health_routes::health_routes;

#[tokio::main]
async fn main() {

    tracing_subscriber::fmt::init();

    let app = Router::new()
        .merge(health_routes());

    let listener =
        tokio::net::TcpListener::bind(
            "0.0.0.0:8080"
        )
        .await
        .unwrap();

    println!(
        "FinIntel Backend running on :8080"
    );

    axum::serve(listener, app)
        .await
        .unwrap();
}