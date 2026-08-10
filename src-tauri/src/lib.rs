mod commands;
mod db;
mod models;
mod server;

use std::path::{Path, PathBuf};
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
    long_about = "WordLex is an offline, native dictionary that gives you instant definitions, synonyms, antonyms, and relations without ever making an API call.\n\nUsage Examples:\n  wordlex ephemeral          (Opens GUI and searches 'ephemeral')\n  wordlex --cli ephemeral    (Prints definition to terminal instantly)\n  wordlex --cli-json hello   (Outputs full definition as JSON)\n  wordlex --search-json eph  (Outputs prefix search results as JSON)\n  wordlex --random-json      (Outputs a random word as JSON)\n  wordlex --from-clipboard   (Reads clipboard and searches in GUI)",
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

    /// Headless mode: output a random word's full detail as JSON to stdout (for tooling integrations).
    #[arg(long, default_value_t = false)]
    pub random_json: bool,

    /// Read the system clipboard and search for its contents in the GUI (Bypasses Wayland hotkey restrictions).
    #[arg(long, default_value_t = false)]
    pub from_clipboard: bool,

    /// Explicitly specify a word to search in the GUI (Alternative to positional argument).
    #[arg(short, long)]
    pub search: Option<String>,

    /// Start the WordLex background service (HTTP API only, no GUI window).
    #[arg(long, default_value_t = false)]
    pub service: bool,

    /// Internal flag to run the blocking service runtime.
    #[arg(long, default_value_t = false, hide = true)]
    pub service_internal: bool,

    /// Force GUI mode.
    #[arg(long, default_value_t = false, hide = true)]
    pub ui: bool,
}

const MAIN_DB_CACHE_KB: i32 = -4096;
const COMMAND_DB_CACHE_KB: i32 = -2048;
const STANDALONE_DB_CACHE_KB: i32 = -1024;

/// Filename of the SQLite database in both the bundled resources and the data dir.
const DB_FILE: &str = "oewn.db";

/// Magic bytes that every SQLite database file starts with.
const SQLITE_HEADER: [u8; 16] = *b"SQLite format 3\0";

fn temp_store_mode() -> &'static str {
    match std::env::var("WORDLEX_TEMP_STORE") {
        Ok(mode) if mode.eq_ignore_ascii_case("MEMORY") => "MEMORY",
        _ => "FILE",
    }
}

fn apply_db_pragmas(
    conn: &Connection,
    cache_kb: i32,
    temp_store: &str,
    with_wal: bool,
) -> Result<(), rusqlite::Error> {
    let mut statements = Vec::new();
    if with_wal {
        statements.push("PRAGMA journal_mode = WAL;".to_string());
    }
    statements.push(format!("PRAGMA cache_size = {};", cache_kb));
    statements.push(format!("PRAGMA temp_store = {};", temp_store));
    conn.execute_batch(&statements.join("\n"))
}

/// Resolves the application data directory the same way Tauri does:
/// `dirs::data_dir()` + the bundle identifier `com.wordlex.desktop`.
///
/// The headless CLI must agree with the GUI's `app.path().app_data_dir()` on
/// every OS. Notably on Windows `dirs::data_local_dir()` points at Local,
/// while Tauri's app data dir lives under Roaming — using `data_dir()` keeps
/// both code paths in sync on all platforms.
fn app_data_dir_path() -> Option<PathBuf> {
    dirs::data_dir().map(|base| base.join("com.wordlex.desktop"))
}

/// Ordered candidate locations for the bundled database, most specific first.
///
/// `primary` is the Tauri-resolved resource path (GUI only); headless callers
/// pass `None` and rely on the standard install layouts plus the
/// `WORDLEX_DB_PATH` override.
fn bundled_database_candidates(primary: Option<PathBuf>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    // Explicit override wins over everything else.
    if let Ok(override_path) = std::env::var("WORDLEX_DB_PATH") {
        if !override_path.trim().is_empty() {
            candidates.push(PathBuf::from(override_path));
        }
    }

    if let Some(path) = primary {
        candidates.push(path);
    }

    // Dev tree: compile-time repo path works regardless of the current directory.
    candidates.push(PathBuf::from(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/resources/oewn.db"
    )));

    // Layouts relative to the running executable:
    //   AppImage mount: <mount>/usr/bin/wordlex -> <mount>/usr/lib/WordLex/resources/oewn.db
    //   macOS app:      WordLex.app/Contents/MacOS/wordlex -> WordLex.app/Contents/Resources/oewn.db
    //   Windows bundle: <install>/wordlex.exe -> <install>/resources/oewn.db
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("../lib/WordLex/resources/oewn.db"));
            candidates.push(dir.join("../lib64/WordLex/resources/oewn.db"));
            candidates.push(dir.join("../Resources/oewn.db"));
            candidates.push(dir.join("../resources/oewn.db"));
        }
    }

    // Standard system package installs.
    candidates.push(PathBuf::from("/usr/lib/WordLex/resources/oewn.db"));
    candidates.push(PathBuf::from("/usr/lib64/WordLex/resources/oewn.db"));

    candidates
}

/// Cheap validity probe: non-empty, starts with the SQLite header magic, and
/// exposes a readable schema. Deliberately avoids a full integrity scan so
/// startup stays fast.
fn is_valid_sqlite(path: &Path) -> bool {
    let Ok(metadata) = std::fs::metadata(path) else {
        return false;
    };
    if metadata.len() == 0 {
        return false;
    }

    let mut magic = [0u8; 16];
    {
        use std::io::Read;
        let Ok(mut file) = std::fs::File::open(path) else {
            return false;
        };
        if file.read_exact(&mut magic).is_err() {
            return false;
        }
    }
    if magic != SQLITE_HEADER {
        return false;
    }

    match rusqlite::Connection::open_with_flags(
        path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    ) {
        Ok(conn) => {
            let readable = conn
                .query_row("SELECT count(*) FROM sqlite_master", [], |row| {
                    row.get::<_, i64>(0)
                })
                .is_ok();
            drop(conn);
            readable
        }
        Err(_) => false,
    }
}

/// Ensures a valid, usable `oewn.db` exists in `data_dir` and returns its path.
///
/// If the existing copy is missing or corrupt, the bundled database is copied
/// in atomically (temp file + rename). This repairs the long-standing
/// "file is not a database" failure caused by a previously interrupted write,
/// which used to brick every subsequent launch until the file was removed.
fn ensure_database(
    data_dir: &Path,
    bundled_candidates: &[PathBuf],
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if !data_dir.exists() {
        std::fs::create_dir_all(data_dir)?;
    }

    let db_path = data_dir.join(DB_FILE);

    if db_path.is_file() && is_valid_sqlite(&db_path) {
        return Ok(db_path);
    }

    let bundled = bundled_candidates
        .iter()
        .find(|candidate| candidate.is_file())
        .cloned()
        .ok_or_else(|| {
            let mut message = format!(
                "WordLex database not found at {:?} and no bundled copy was found. Tried:",
                db_path
            );
            for candidate in bundled_candidates {
                message.push_str(&format!("\n  - {:?}", candidate));
            }
            message
                .push_str("\nRun the WordLex GUI once to initialize it, or set WORDLEX_DB_PATH.");
            message
        })?;

    // Atomic replace so a crash mid-copy can never leave a half-written DB.
    let tmp_path = data_dir.join(format!("{}.tmp-{}", DB_FILE, std::process::id()));
    std::fs::copy(&bundled, &tmp_path)?;

    // The bundled file may live on a read-only mount (e.g. AppImage); make the
    // copy writable so WAL journaling works later.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&tmp_path, std::fs::Permissions::from_mode(0o644))?;
    }

    if !is_valid_sqlite(&tmp_path) {
        let _ = std::fs::remove_file(&tmp_path);
        return Err(format!(
            "Bundled database at {:?} failed validation after copy.",
            bundled
        )
        .into());
    }

    if std::fs::rename(&tmp_path, &db_path).is_err() {
        // e.g. Windows when the destination already exists; replace instead.
        let _ = std::fs::remove_file(&db_path);
        let _ = std::fs::remove_file(&tmp_path);
        std::fs::copy(&bundled, &db_path)?;
    }

    Ok(db_path)
}

/// Opens the SQLite database used by the GUI.
///
/// Ensures a valid copy exists in the app data dir (copying the bundled
/// `resources/oewn.db` when missing or corrupt), then opens it read-write with
/// WAL journaling and a bounded page cache.
fn open_database(app: &tauri::App) -> Result<Connection, Box<dyn std::error::Error>> {
    let resource_path = app
        .path()
        .resolve("resources/oewn.db", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve resource: {}", e))?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let candidates = bundled_database_candidates(Some(resource_path));
    let db_path = ensure_database(&app_data_dir, &candidates)?;

    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;

    apply_db_pragmas(&conn, MAIN_DB_CACHE_KB, temp_store_mode(), true)?;

    // Set up FTS5 index (idempotent)
    db::setup_fts(&conn)?;

    Ok(conn)
}

/// Opens the database from the app data directory without requiring a running
/// Tauri instance, for headless CLI commands and the `--service` daemon.
///
/// Resolves the same data directory the GUI uses (including on Windows, where
/// `data_local_dir` would point somewhere different) and runs the same
/// validation/repair so headless callers recover from corrupt databases too.
fn open_database_standalone() -> Result<Connection, Box<dyn std::error::Error>> {
    let app_data_dir = app_data_dir_path().ok_or("Could not determine the local data directory")?;

    let candidates = bundled_database_candidates(None);
    let db_path = ensure_database(&app_data_dir, &candidates)?;

    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;

    apply_db_pragmas(&conn, STANDALONE_DB_CACHE_KB, temp_store_mode(), false)?;

    // Headless callers also rely on the FTS5 prefix index; make sure it exists
    // even when the GUI has never run on this machine.
    db::setup_fts(&conn)?;

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
                eprintln!(r#"{{"error":"{}"}}"#, e);
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
                eprintln!(r#"{{"error":"{}"}}"#, e);
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
                eprintln!(r#"{{"error":"{}"}}"#, e);
                std::process::exit(1);
            }
        };
        match db::search_words(&conn, prefix, 50) {
            Ok(results) => {
                println!("{}", serde_json::to_string(&results).unwrap_or_default());
            }
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}"#, e);
                std::process::exit(1);
            }
        }
        return true;
    }

    // ─── --random-json: random word as JSON ─────────────────
    if cli.random_json {
        let conn = match open_database_standalone() {
            Ok(c) => c,
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}"#, e);
                std::process::exit(1);
            }
        };
        match db::get_random_word(&conn) {
            Ok(Some(detail)) => {
                println!("{}", serde_json::to_string(&detail).unwrap_or_default());
            }
            Ok(None) => {
                println!("null");
            }
            Err(e) => {
                eprintln!(r#"{{"error":"{}"}}"#, e);
                std::process::exit(1);
            }
        }
        return true;
    }

    false
}

fn run_service_mode() -> Result<(), Box<dyn std::error::Error>> {
    if server::is_service_running() {
        return Ok(());
    }

    let conn = open_database_standalone()?;
    let shared = Arc::new(Mutex::new(conn));
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(server::start_server(shared));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ─── Headless CLI / runtime mode dispatch: runs BEFORE Tauri ───
    let cli = Cli::parse();
    if cli.service {
        if server::is_service_running() {
            println!("{}", "WordLex service is already running.".green());
            std::process::exit(0);
        }
        println!("{}", "Starting WordLex service in the background...".blue());
        let current_exe = std::env::current_exe().expect("Failed to get current executable path");
        if let Err(e) = std::process::Command::new(current_exe)
            .arg("--service-internal")
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
        {
            eprintln!("{}", format!("Failed to start service: {}", e).red());
            std::process::exit(1);
        }
        std::process::exit(0);
    }

    if cli.service_internal {
        if let Err(e) = run_service_mode() {
            eprintln!("{}", format!("Service mode failed: {}", e).red());
            std::process::exit(1);
        }
        std::process::exit(0);
    }
    if handle_headless_cli(&cli) {
        std::process::exit(0);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();

                if let Ok(cli) = Cli::try_parse_from(args) {
                    if cli.service {
                        return;
                    }
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
            // ensure_database() and the FTS setup run here as side effects;
            // the GUI queries through the dedicated DbState connection below.
            open_database(app)?;

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

            // Register Tauri managed state
            app.manage(DbState(Mutex::new(
                // Dedicated connection for Tauri commands.
                {
                    let db_path = app.path().app_data_dir()?.join("oewn.db");

                    let conn2 = Connection::open_with_flags(
                        &db_path,
                        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE
                            | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
                    )?;
                    apply_db_pragmas(&conn2, COMMAND_DB_CACHE_KB, temp_store_mode(), true)?;
                    conn2
                },
            )));
            app.manage(HistoryState(Mutex::new(Vec::new())));

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
