use std::sync::{Arc, Mutex};

use axum::{
    extract::{Query, State as AxumState},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use rusqlite::Connection;
use serde::Deserialize;
use tower_http::cors::CorsLayer;

use crate::db;
use crate::models::{SearchResult, WordDetail};

/// Shared state for the axum server — wraps the same DB connection.
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
}

#[derive(Deserialize)]
pub struct SearchParams {
    q: Option<String>,
    limit: Option<usize>,
}

#[derive(Deserialize)]
pub struct LookupParams {
    word: Option<String>,
}

/// Starts the local HTTP server on 127.0.0.1:17432.
///
/// This server is consumed by the Vicinae/Raycast extension and provides
/// the same data as the Tauri commands but over REST. It only binds to
/// localhost so it's not accessible from the network.
///
/// Routes:
///   GET /search?q=<prefix>&limit=<n>  → Vec<SearchResult>
///   GET /lookup?word=<word>            → WordDetail (or 404)
///   GET /random                        → WordDetail (or 404)
///   GET /health                        → {"status":"ok","version":"0.1.0"}
pub async fn start_server(db_conn: Arc<Mutex<Connection>>) {
    let state = AppState { db: db_conn };

    let app = Router::new()
        .route("/search", get(handle_search))
        .route("/lookup", get(handle_lookup))
        .route("/random", get(handle_random))
        .route("/health", get(handle_health))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = match tokio::net::TcpListener::bind("127.0.0.1:17432").await {
        Ok(l) => l,
        Err(e) => {
            log::error!("Failed to bind HTTP server on :17432: {}", e);
            return;
        }
    };

    log::info!("WordLex HTTP server listening on http://127.0.0.1:17432");

    if let Err(e) = axum::serve(listener, app).await {
        log::error!("HTTP server error: {}", e);
    }
}

async fn handle_search(
    AxumState(state): AxumState<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<SearchResult>>, StatusCode> {
    let query = params.q.unwrap_or_default();
    let limit = params.limit.unwrap_or(30).min(100);

    let conn = state.db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let results = db::search_words(&conn, &query, limit)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(results))
}

async fn handle_lookup(
    AxumState(state): AxumState<AppState>,
    Query(params): Query<LookupParams>,
) -> Result<Json<WordDetail>, StatusCode> {
    let word = params.word.ok_or(StatusCode::BAD_REQUEST)?;

    let conn = state.db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = db::lookup_word(&conn, &word)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match result {
        Some(detail) => Ok(Json(detail)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn handle_random(
    AxumState(state): AxumState<AppState>,
) -> Result<Json<WordDetail>, StatusCode> {
    let conn = state.db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = db::get_random_word(&conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match result {
        Some(detail) => Ok(Json(detail)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn handle_health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "version": "0.1.0",
        "app": "WordLex"
    }))
}
