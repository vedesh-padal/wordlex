use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db;
use crate::models::{SearchResult, WordDetail};

/// Shared database connection state, managed by Tauri.
///
/// We use a Mutex<Connection> because rusqlite's Connection is !Send+!Sync.
/// For a single-user desktop app doing read-only queries this is fine —
/// contention is minimal since queries complete in < 1ms.
pub struct DbState(pub Mutex<Connection>);

/// In-memory lookup history, most recent first.
/// Capped at 100 entries to avoid unbounded growth.
pub struct HistoryState(pub Mutex<Vec<String>>);

const MAX_HISTORY: usize = 100;

/// Prefix search for the type-ahead dropdown.
/// Called on every keystroke (after frontend debounce).
#[tauri::command]
pub async fn search_words(
    query: String,
    state: State<'_, DbState>,
) -> Result<Vec<SearchResult>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::search_words(&conn, &query, 50).map_err(|e| e.to_string())
}

/// Full word lookup — returns all senses, synonyms, antonyms, related words.
/// Also records the word in lookup history.
#[tauri::command]
pub async fn lookup_word(
    word: String,
    state: State<'_, DbState>,
    history: State<'_, HistoryState>,
) -> Result<Option<WordDetail>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let result = db::lookup_word(&conn, &word).map_err(|e| e.to_string())?;

    // Record in history if we got a result
    if let Some(ref detail) = result {
        let mut hist = history.0.lock().map_err(|e| e.to_string())?;
        // Remove duplicate if already in history
        hist.retain(|w| w.to_lowercase() != detail.word.to_lowercase());
        // Push to front
        hist.insert(0, detail.word.clone());
        // Cap at MAX_HISTORY
        hist.truncate(MAX_HISTORY);
    }

    Ok(result)
}

/// Returns a random interesting word with full detail.
/// Used for "Word of the Day" feature.
#[tauri::command]
pub async fn get_random_word(
    state: State<'_, DbState>,
) -> Result<Option<WordDetail>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_random_word(&conn).map_err(|e| e.to_string())
}

/// Returns the last N looked-up words (most recent first).
#[tauri::command]
pub async fn get_history(
    history: State<'_, HistoryState>,
) -> Result<Vec<String>, String> {
    let hist = history.0.lock().map_err(|e| e.to_string())?;
    Ok(hist.clone())
}

#[tauri::command]
pub fn quit_app() {
    std::process::exit(0);
}
