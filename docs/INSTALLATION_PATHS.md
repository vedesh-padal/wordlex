# Installation Paths & Naming Reference

Committed reference for maintainers. Covers where every piece of WordLex and
the Vicinae extension is installed, so install/uninstall and path-related bugs
are easy to reason about.

## Naming

| Thing | Value |
|---|---|
| Tauri product name | `WordLex` |
| Tauri bundle identifier | `com.wordlex.desktop` |
| Binary name (Linux/macOS) | `wordlex` |
| Binary name (Windows) | `wordlex.exe` |
| Extension name (manifest `name`) | `wordlex` |
| Extension author (package scope) | `@vedesh-padal/wordlex` |
| Database filename | `oewn.db` |

The identifier `com.wordlex.desktop` drives the runtime data directory, the
product name `WordLex` drives the bundle resource directories, and the binary
name `wordlex` drives the CLI entry point.

## Desktop app — binary and bundled DB per install type

| Install type | Binary | Bundled DB resource | On PATH? |
|---|---|---|---|
| `.deb` (Debian/Ubuntu/Mint) | `/usr/bin/wordlex` | `/usr/lib/WordLex/resources/oewn.db` | yes |
| `.rpm` (Fedora/RHEL/openSUSE) | `/usr/bin/wordlex` | `/usr/lib64/WordLex/resources/oewn.db` (lib or lib64 by distro) | yes |
| AppImage | the file itself; at runtime FUSE-mounts under `/tmp/.mount_<name>/` | `<mount>/usr/lib/WordLex/resources/oewn.db` | no |
| macOS `.app` (via `.dmg` or `.app.tar.gz`) | `/Applications/WordLex.app/Contents/MacOS/wordlex` | `WordLex.app/Contents/Resources/oewn.db` | no |
| Windows `.exe` (NSIS) | `%LOCALAPPDATA%\WordLex\wordlex.exe` | `%LOCALAPPDATA%\WordLex\resources\oewn.db` | no |
| Windows `.msi` | `C:\Program Files\WordLex\wordlex.exe` | `C:\Program Files\WordLex\resources\oewn.db` | no |

## Runtime data dir (the DB the app actually uses)

On first launch the app copies the bundled DB here (via `ensure_database()`,
which also validates and repairs a corrupt copy):

| OS | Path |
|---|---|
| Linux | `$XDG_DATA_HOME/com.wordlex.desktop/oewn.db` (default `~/.local/share/com.wordlex.desktop/oewn.db`) |
| macOS | `~/Library/Application Support/com.wordlex.desktop/oewn.db` |
| Windows | `%APPDATA%\com.wordlex.desktop\oewn.db` (Roaming) |

> Note: on Windows the headless CLI previously resolved this with
> `dirs::data_local_dir()` = `%LOCALAPPDATA%` (Local), which disagreed with the
> GUI's Roaming path. `ensure_database()` now uses the same resolution as Tauri
> on every OS (`dirs::data_dir()` + identifier).

## Bundled-DB resolution (`ensure_database()`)

Candidate locations, most specific first (first existing file wins):

1. `WORDLEX_DB_PATH` environment variable (explicit override).
2. Tauri-resolved resource path (GUI only).
3. Dev tree: `<repo>/src-tauri/resources/oewn.db` (compile-time path, works
   regardless of cwd).
4. Relative to the running executable:
   - AppImage: `<exe-dir>/../lib/WordLex/resources/oewn.db` and
     `<exe-dir>/../lib64/WordLex/resources/oewn.db`
   - macOS: `<exe-dir>/../Resources/oewn.db`
   - Windows: `<exe-dir>/../resources/oewn.db`
5. System installs: `/usr/lib/WordLex/resources/oewn.db`,
   `/usr/lib64/WordLex/resources/oewn.db`.

If the data-dir copy is missing or corrupt, the app atomically re-copies the
bundled DB (temp file + rename) and makes it writable.

## Vicinae extension

- Build output (`vici build`): `~/.local/share/vicinae/extensions/wordlex/`
  - `package.json` (manifest), `search-dictionary.js`, `define-clipboard.js`,
    `random-word.js`, `assets/`, plus dev artifacts `cli.pid`, `dev.log`.
- Registration: Vicinae scans `~/.local/share/vicinae/extensions/`; per-command
  visit data lives in `~/.local/share/vicinae/metadata.json`
  (`@vedesh-padal/wordlex:search-dictionary`, etc.).
- Uninstall: Vicinae Settings → Extensions → Remove, or
  `rm -rf ~/.local/share/vicinae/extensions/wordlex` (leftover `metadata.json`
  entries are harmless).

## Uninstall (desktop app)

| Install type | Uninstall |
|---|---|
| `.deb` | `sudo apt remove wordlex` |
| `.rpm` | `sudo dnf remove wordlex` (or zypper equivalent) |
| AppImage | delete the file (and the `~/.local/bin/wordlex` symlink if created by `--install-cli`) |
| macOS | delete `/Applications/WordLex.app` |
| Windows | Add/Remove Programs → WordLex (or `winget uninstall` if registered) |

Optional data removal: delete the data-dir `oewn.db` (and `-wal`/`-shm`
sidecars) — the app re-creates it from the bundle on next launch.
