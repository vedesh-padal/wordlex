# WordLex — Development Guide

Everything a developer needs to set up, build, lint, test, run, and release WordLex,
plus the CLI reference and the companion **wordlex-vicinae** extension workflow.

---

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 20+ | Frontend (Vite + React 19 + TypeScript) |
| Rust | stable (rustup) | Tauri v2 backend |
| Linux system deps | see below | GTK / WebKitGTK for Tauri |
| `oewn.db` | 2025 edition | Bundled SQLite dictionary (~168 MB) |

Linux system packages (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

---

## 2. Getting the database (IMPORTANT — do it correctly)

The dictionary DB must exist at `src-tauri/resources/oewn.db`. It is **not** in git.

The CI/release pipeline downloads the Open English WordNet zip and unzips it.
The correct manual equivalent:

```bash
mkdir -p src-tauri/resources
curl -sL "https://raw.githubusercontent.com/x-englishwordnet/sqlite/master/oewn-2025-sqlite-2.3.2.sqlite.zip" -o oewn.zip
unzip -q oewn.zip -d src-tauri/resources/
mv src-tauri/resources/oewn-*.sqlite src-tauri/resources/oewn.db
rm oewn.zip
# Verify it is a real SQLite file:
file src-tauri/resources/oewn.db        # → "SQLite 3.x database"
```

> ⚠️ Do **not** use `wget -qO src-tauri/resources/oewn.db <zip-url>` — that saves the
> **zip bytes** named `oewn.db`, which is not a database. On first launch the app copies
> this file into the data dir and fails with `file is not a database`.
> The release pipeline had this exact class of bug in v1.5.0/v1.6.0 (see §10).

---

## 3. Install dependencies

```bash
npm install                 # frontend + Tauri CLI
cd src-tauri && cargo fetch # (optional) prefetch Rust crates
```

---

## 4. Run locally (development)

```bash
npm run tauri dev           # builds Rust + starts Vite dev server + launches GUI
```

Frontend-only iteration (uses the already-built backend if you keep `tauri dev` running):

```bash
npm run dev                 # vite dev server only
```

---

## 5. Build

```bash
npm run build               # frontend: tsc --noEmit-equivalent + vite build
npm run tauri build         # debug binary
npm run tauri build -- --release   # release binary + bundles (deb/AppImage/rpm/etc.)
```

Outputs land in `src-tauri/target/{debug,release}/`. Bundles land in
`src-tauri/target/release/bundle/`.

---

## 6. Lint, format, typecheck (quality gate)

```bash
npm run lint                # runs BOTH checks below
npm run lint:ts             # TypeScript typecheck (tsc --noEmit)
npm run lint:rs             # Rust clippy with warnings as errors (cargo clippy -- -D warnings)

cd src-tauri && cargo fmt -- --check    # Rust formatting check
cd src-tauri && cargo fmt               # auto-format
cd src-tauri && cargo check             # fast type-check of Rust (no codegen)

npx eslint src/             # ESLint on frontend (if you add it as a script)
```

CI runs: `npm run lint:ts`, `cargo fmt -- --check`, `npm run lint:rs`.

---

## 7. Tests

> Currently there are **no unit/integration tests** in either `src-tauri/src` or `src/`.
> Add tests, then run:

```bash
cd src-tauri && cargo test          # Rust unit/integration tests
npm test                            # frontend tests (once a runner is configured)
```

---

## 8. CLI reference (headless / tooling)

The `wordlex` binary is a single Tauri app that dispatches on argv before the GUI starts.

| Flag | Description | Example |
|------|-------------|---------|
| *(positional)* | Open GUI and search this word | `wordlex ephemeral` |
| `--search <word>` | Same, but explicit | `wordlex --search ephemeral` |
| `--cli <word>` | Headless: formatted definition to stdout | `wordlex --cli ephemeral` |
| `--cli-json <word>` | Headless: full word detail as JSON | `wordlex --cli-json ephemeral` |
| `--search-json <prefix>` | Headless: prefix results as JSON array | `wordlex --search-json eph` |
| `--random-json` | Headless: random word detail as JSON | `wordlex --random-json` |
| `--from-clipboard` | Read clipboard, search in GUI | `wordlex --from-clipboard` |
| `--service` | Start HTTP API daemon (no GUI) | `wordlex --service` |
| `--service-internal` | Internal: the actual daemon runtime | (do not call directly) |
| `--ui` | Internal: force GUI mode | (hidden) |
| `--version` | Print version | `wordlex --version` |

Examples:

```bash
wordlex --search-json run      # → [{"word":"run","pos_list":["v",...]}, ...]
wordlex --cli-json apple       # → {"word":"apple","pronunciation":"…","senses":[…]}
wordlex --random-json          # → one random WordDetail
wordlex --cli apple            # → human-readable formatted definition
```

Notes:

- All `--*-json` flags print **raw JSON to stdout** and are meant for integrations
  (like the Vicinae extension). Errors go to **stderr as `{"error":"…"}`**, exit code 1.
- Headless commands open the DB **read-only** from the data dir
  (`~/.local/share/com.wordlex.desktop/oewn.db`). See §12 for bootstrap caveat.
- Expected latency: `--cli`/`--cli-json`/`--search-json` ≈ 30–50 ms,
  `--random-json` ≈ 300 ms.

---

## 9. HTTP service (opt-in, not running by default)

REST API on `127.0.0.1:17432`, only when started explicitly:

```bash
wordlex --service             # start as background daemon (no GUI window)
curl http://127.0.0.1:17432/health   # → {"status":"ok","version":…,"app":"WordLex"}
```

| Endpoint | Description |
|----------|-------------|
| `GET /search?q=<prefix>&limit=<n>` | Prefix search (limit default 30, max 100) |
| `GET /lookup?word=<word>` | Full word detail (404 if not found) |
| `GET /random` | Random word detail |
| `GET /health` | Health + version |

> ⚠️ The service is a **separate process** (spawned via `--service-internal`) and is
> intentionally **not** auto-started by the GUI. It is only for consumers that want
> REST (e.g. a future extension mode). The current Vicinae extension uses the CLI
> (`--*-json`) and does **not** need it running.
> To stop it: `pkill -f 'wordlex --service-internal'` (or `kill <pid>`).

---

## 10. Memory measurement & CLI benchmark

```bash
../scripts/measure-memory.sh          # RSS + PSS of wordlex + WebKit processes
../scripts/benchmark-cli-latency.sh   # times --cli / --cli-json / --search-json / --random-json
../scripts/preserve-deb-artifacts.sh  # keep .deb artifacts (if you use it)
```

Reference results (see `docs/PERF_RESULTS.md`):

- v1.5 baseline → v1.6 optimizations: total RSS **444.6 MB → 225.8 MB** (−49%), PSS **193.6 → 126.6 MB** (−35%).
- Idle breakdown (v1.6): wordlex ≈ 37 MB PSS, WebKit web ≈ 83 MB PSS, WebKit network ≈ 6 MB PSS.
- The dominant fixed cost is the WebKit webview. The experimental Preact + webview-destruction
  build (`170d51b`) dropped idle to ~37 MB but was **reverted** (`0723e13`).

---

## 11. Release / packaging notes

Releases are cut by pushing a tag; the `release.yml` workflow builds and uploads
draft releases (`releaseDraft: true`), which you then publish on GitHub.

```bash
# after bumping version in Cargo.toml + package.json:
git tag vX.Y.Z && git push origin vX.Y.Z
```

History you should know about:

- v1.5.0 / v1.6.0: the CI database step was fragile (fail-soft `|| echo`, `touch` mock
  fallback, unverified rename). Result: **broken artifacts** — Windows `.exe` 3.9 MB /
  `.msi` 5.6 MB (no DB bundled), v1.5.0 macOS `.dmg`/`.tar.gz` were 9-byte uploads.
- v1.6.0 Linux AppImage/.deb bundle a **valid** DB (verified), but **any** broken
  artifact run first can write a corrupt DB into the data dir (see §12).
- `5aaf4c0` fixed the download step (proper curl + unzip + non-empty verification).
  The **v2.0.0** release is the first with correct Windows installers (`.exe` ~35 MB,
  `.msi` ~70 MB). Its tag was re-cut against the current `main` so the release ships the
  `--install-cli`/`--uninstall-cli` launcher, the Linux **arm64** leg, and the committed
  install/uninstall docs + one-line installer scripts.

---

## 12. Troubleshooting

**`file is not a database` on launch (setup hook panic)**

Cause: the app copies `resources/oewn.db` into the data dir
(`~/.local/share/com.wordlex.desktop/oewn.db`) **only if that file is missing**. If an
existing DB there is corrupt/truncated (from an interrupted first-run copy, or a run of a
broken artifact), the app opens the corrupt file and fails — every time, until the file
is deleted.

Fix:

```bash
rm -f ~/.local/share/com.wordlex.desktop/oewn.db*   # remove corrupt DB + WAL/SHM
wordlex                      # re-runs the copy from the bundled resource
```

(Planned code fix: validate the existing DB and atomically re-copy it from the bundle.)

**Extension says WordLex not found / database not found**

- Ensure the `wordlex` binary is on `$PATH` (AppImage does **not** install it; use the
  `.deb`/`.rpm`, or a manually built binary).
- Ensure the DB exists: launch the GUI once (`wordlex`) so it initializes the data dir.

---

## 13. Companion extension — wordlex-vicinae

Repo: `wordlex-vicinae` (or `extensions/wordlex` inside the vicinae-extensions monorepo).
The `vici` CLI ships inside `@vicinae/api`.

```bash
cd wordlex-vicinae
npm install                 # install deps (installs @vicinae/api → .bin/vici)

npm run build               # vici build  → writes to ~/.local/share/vicinae/extensions/wordlex
npm run dev                 # vici develop → watch/live-reload (requires Vicinae running)
npm run typecheck           # tsc --noEmit
npm run lint                # eslint src/
npm run format              # prettier --write
```

Testing manually:

1. Preflight: `wordlex --version` on PATH; run `wordlex` once to init the DB.
2. Build: `npm run build`.
3. Open the Vicinae launcher → `WordLex` → try all three commands
   (Search Dictionary, Define Clipboard Word, Random Word) and every action on a result.

Uninstall / reinstall:

- Via Vicinae GUI: Settings → Extensions → WordLex → Remove/Uninstall.
- Manually (equivalent): `rm -rf ~/.local/share/vicinae/extensions/wordlex`
- Reinstall fresh: `cd wordlex-vicinae && npm install && npm run build`

> Note: `npx vici lint` (manifest validation) requires `@vicinae/api >= 0.16.0`.
> This extension currently pins `^0.8.2`, so only `build`/`develop` are available —
> bump `@vicinae/api` to get `vici lint` when ready.
