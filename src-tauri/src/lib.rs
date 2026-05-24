mod commands;
mod db;
mod models;
mod server;

use std::sync::{Arc, Mutex};

use commands::{DbState, HistoryState};
use rusqlite::Connection;
use tauri::{
    menu::{Menu, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager, Listener,
};

/// Opens the SQLite database from the bundled resources directory.
///
/// The DB is bundled at `resources/oewn.db` and Tauri's resource resolver
/// maps it to the correct location at runtime (inside the AppImage, .deb install
/// dir, or the dev source tree).
///
/// We set WAL journal mode and a generous cache size for read performance.
fn open_database(app: &tauri::App) -> Result<Connection, Box<dyn std::error::Error>> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?
        .join("resources")
        .join("oewn.db");

    if !resource_path.exists() {
        return Err(format!(
            "Database not found at {:?}. Please place oewn.db in src-tauri/resources/",
            resource_path
        )
        .into());
    }

    let conn = Connection::open_with_flags(
        &resource_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE
            | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;

    // Performance pragmas for read-heavy workload
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA cache_size = -32000;
         PRAGMA temp_store = MEMORY;",
    )?;

    // Set up FTS5 index (idempotent)
    db::setup_fts(&conn)?;

    Ok(conn)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .setup(|app| {
            // ─── Database ───────────────────────────────────────
            let conn = open_database(app)?;
            let conn_arc = Arc::new(Mutex::new(conn));

            // Register Tauri managed state
            app.manage(DbState(Mutex::new(
                // Open a second connection for Tauri commands so we don't
                // contend with the HTTP server's Arc<Mutex<Connection>>.
                // Both are read-only so no write contention.
                {
                    let resource_path = app
                        .path()
                        .resource_dir()?
                        .join("resources")
                        .join("oewn.db");

                    let conn2 = Connection::open_with_flags(
                        &resource_path,
                        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE
                            | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
                    )?;
                    conn2.execute_batch(
                        "PRAGMA journal_mode = WAL;
                         PRAGMA cache_size = -32000;
                         PRAGMA temp_store = MEMORY;",
                    )?;
                    conn2
                },
            )));
            app.manage(HistoryState(Mutex::new(Vec::new())));

            // ─── HTTP Server (for Vicinae extension) ────────────
            let db_for_server = conn_arc.clone();
            tauri::async_runtime::spawn(async move {
                server::start_server(db_for_server).await;
            });

            // ─── System Tray ────────────────────────────────────
            let open_item = MenuItemBuilder::with_id("open", "Open WordLex")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let wotd_item = MenuItemBuilder::with_id("wotd", "Word of the Day")
                .accelerator("CmdOrCtrl+D")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            let menu = Menu::with_items(app, &[&open_item, &wotd_item, &quit_item])?;
            app.manage(menu.clone());

            let tray = TrayIconBuilder::new()
                .tooltip("WordLex")
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "wotd" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("show-random-word", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ─── Event listener for UI quit ──────────────
            let app_handle = app.handle().clone();
            app.listen("quit-app", move |_| {
                app_handle.exit(0);
            });

            // ─── Window: hide on close instead of quitting ──────
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::search_words,
            commands::lookup_word,
            commands::get_random_word,
            commands::get_history,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running WordLex");
}
