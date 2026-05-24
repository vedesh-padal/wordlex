mod commands;
mod db;
mod models;
mod server;

use std::sync::{Arc, Mutex};

use clap::Parser;
use colored::*;
use commands::{DbState, HistoryState};
use rusqlite::Connection;
use tauri::{
    menu::{Menu, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Listener, Manager,
};

#[derive(Parser, Debug)]
#[command(
    name = "wordlex",
    about = "WordLex: A lightning-fast native Linux dictionary and thesaurus.",
    long_about = "WordLex is an offline, native dictionary that gives you instant definitions, synonyms, antonyms, and relations without ever making an API call.\n\nUsage Examples:\n  wordlex ephemeral          (Opens GUI and searches 'ephemeral')\n  wordlex --cli ephemeral    (Prints definition to terminal instantly)\n  wordlex --cli-json hello   (Outputs full definition as JSON)\n  wordlex --search-json eph  (Outputs prefix search results as JSON)\n  wordlex --from-clipboard   (Reads clipboard and searches in GUI)",
    version
)]
struct Cli {
    /// Open the WordLex GUI and instantly search for this word.
    pub word: Option<String>,

    /// Headless mode: search the SQLite database and print the fully formatted definition to the terminal.
    #[arg(long)]
    pub cli: Option<String>,

    /// Headless mode: output the full word detail as raw JSON to stdout (for tooling integrations).
    #[arg(long)]
    pub cli_json: Option<String>,

    /// Headless mode: output prefix search results as a JSON array to stdout (for tooling integrations).
    #[arg(long)]
    pub search_json: Option<String>,

    /// Read the system clipboard and search for its contents in the GUI (Bypasses Wayland hotkey restrictions).
    #[arg(long, default_value_t = false)]
    pub from_clipboard: bool,

    /// Explicitly specify a word to search in the GUI (Alternative to positional argument).
    #[arg(short, long)]
    pub search: Option<String>,
}

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

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)?;
    }

    let db_path = app_data_dir.join("oewn.db");

    if !db_path.exists() {
        if !resource_path.exists() {
            return Err(format!(
                "Bundled database not found at {:?}. Please place oewn.db in src-tauri/resources/",
                resource_path
            )
            .into());
        }
        std::fs::copy(&resource_path, &db_path)?;
    }

    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
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

/// Opens the database directly from the XDG app data directory,
/// without requiring a running Tauri App instance.
/// This is used by headless CLI commands that must work even when the GUI is already running.
fn open_database_standalone() -> Result<Connection, Box<dyn std::error::Error>> {
    // Tauri stores the DB under ~/.local/share/com.wordlex.app/oewn.db
    let app_data_dir = dirs::data_dir()
        .ok_or("Could not determine XDG data directory")?
        .join("com.wordlex.app");

    let db_path = app_data_dir.join("oewn.db");

    if !db_path.exists() {
        return Err(format!(
            "WordLex database not found at {:?}. Run the WordLex GUI at least once to initialize the database.",
            db_path
        )
        .into());
    }

    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;

    conn.execute_batch(
        "PRAGMA cache_size = -32000;
         PRAGMA temp_store = MEMORY;",
    )?;

    Ok(conn)
}

/// Handle headless CLI commands (--cli, --cli-json, --search-json) before Tauri initializes.
/// This runs before the single-instance plugin, so it works even when the GUI is already open.
/// Returns true if a headless command was handled (caller should exit), false otherwise.
fn handle_headless_cli(cli: &Cli) -> bool {
    // ─── --cli: colored terminal output ──────────────────────
    if let Some(ref cli_word) = cli.cli {
        let conn = match open_database_standalone() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("{}", format!("Error: {}", e).red());
                std::process::exit(1);
            }
        };

        match db::lookup_word(&conn, cli_word) {
            Ok(Some(detail)) => {
                let pronun = if let Some(p) = detail.pronunciation {
                    format!(" /{}/", p).truecolor(150, 150, 150)
                } else {
                    "".normal()
                };
                println!("\n{}{}", detail.word.bold().green(), pronun);

                let mut current_pos = String::new();
                for sense in detail.senses {
                    if sense.pos != current_pos {
                        current_pos = sense.pos.clone();
                        let pos_label = match current_pos.as_str() {
                            "n" => "NOUN",
                            "v" => "VERB",
                            "a" | "s" => "ADJECTIVE",
                            "r" => "ADVERB",
                            _ => &current_pos,
                        };
                        println!("\n  {}", pos_label.bold().blue());
                    }
                    println!(
                        "    {}. {}",
                        sense.sense_num.to_string().dimmed(),
                        sense.definition
                    );
                    if !sense.examples.is_empty() {
                        println!(
                            "       \"{}\"",
                            sense.examples[0].italic().truecolor(180, 180, 180)
                        );
                    }
                }
                println!();
            }
            Ok(None) => {
                println!("{}", "Word not found in the database.".red());
            }
            Err(e) => {
                eprintln!("{}", format!("Database error: {}", e).red());
            }
        }
        return true;
    }

    // ─── --cli-json: raw JSON output of a full word lookup ───
    if let Some(ref word) = cli.cli_json {
        let conn = match open_database_standalone() {
            Ok(c) => c,
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}", e);
                std::process::exit(1);
            }
        };
        match db::lookup_word(&conn, word) {
            Ok(Some(detail)) => {
                println!("{}", serde_json::to_string(&detail).unwrap_or_default());
            }
            Ok(None) => {
                println!("null");
            }
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}", e);
                std::process::exit(1);
            }
        }
        return true;
    }

    // ─── --search-json: raw JSON output of prefix search ────
    if let Some(ref prefix) = cli.search_json {
        let conn = match open_database_standalone() {
            Ok(c) => c,
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}", e);
                std::process::exit(1);
            }
        };
        match db::search_words(&conn, prefix, 50) {
            Ok(results) => {
                println!("{}", serde_json::to_string(&results).unwrap_or_default());
            }
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}", e);
                std::process::exit(1);
            }
        }
        return true;
    }

    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ─── Headless CLI: runs BEFORE Tauri, bypasses single-instance ───
    let cli = Cli::parse();
    if handle_headless_cli(&cli) {
        std::process::exit(0);
    }
    // Re-construct args without --cli for Tauri (it will re-parse in setup)
    drop(cli);

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();

                if let Ok(cli) = Cli::try_parse_from(args) {
                    let search_term = cli.search.or(cli.word);
                    if let Some(word) = search_term {
                        let _ = window.emit("search-word", word);
                    } else if cli.from_clipboard {
                        let _ = window.emit("search-clipboard", ());
                    }
                }
            }
        }))
        .setup(|app| {
            // ─── Database ───────────────────────────────────────
            let conn = open_database(app)?;

            // ─── Parse CLI Args (GUI-only flags) ────────────────
            // Note: --cli is already handled before Tauri init (see handle_headless_cli).
            let cli = Cli::parse();
            let search_term = cli.search.or(cli.word);
            if let Some(word) = search_term {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    let _ = handle.emit("search-word", word);
                });
            } else if cli.from_clipboard {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    let _ = handle.emit("search-clipboard", ());
                });
            }

            let conn_arc = Arc::new(Mutex::new(conn));

            // Register Tauri managed state
            app.manage(DbState(Mutex::new(
                // Open a second connection for Tauri commands so we don't
                // contend with the HTTP server's Arc<Mutex<Connection>>.
                // Both are read-only so no write contention.
                {
                    let db_path = app.path().app_data_dir()?.join("oewn.db");

                    let conn2 = Connection::open_with_flags(
                        &db_path,
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

            let _tray = TrayIconBuilder::new()
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
            commands::clear_history,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running WordLex");
}
