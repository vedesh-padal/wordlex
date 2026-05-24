# WordLex

A native Linux dictionary and thesaurus — the Linux equivalent of [WordWeb](https://wordweb.info/) for Windows.

**Offline-first, instant lookup, keyboard-driven.**

Powered by [Open English WordNet (OEWN) 2025](https://github.com/x-englishwordnet/sqlite) — 152,000+ words, 120,000+ synsets, completely offline.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Linux-brightgreen)
![Tech](https://img.shields.io/badge/built_with-Tauri_v2-orange)

---

## Features

### Core
- **Instant search** — type-ahead with FTS5 prefix search, results in < 100ms
- **Full definitions** — grouped by part of speech (noun, verb, adjective, adverb)
- **Synonyms & Antonyms** — clickable for cross-reference navigation
- **Usage examples** — real-world sentence examples from WordNet
- **Related words** — hypernyms ("type of"), hyponyms ("types"), derived forms
- **Keyboard-driven** — `↑↓` to navigate, `Enter` to select, `Esc` to clear, `Ctrl+L` to focus search
- **Global hotkey** — `Alt+W` to summon from anywhere (configurable)
- **System tray** — lives in tray, never fully quits
- **100% offline** — zero network dependency, all data local

### UI
- **Dark / Light theme** — system-aware with manual toggle
- **Frameless window** — custom titlebar with drag region
- **Back / Forward navigation** — `Alt+←` / `Alt+→`
- **Copy definition** — one-click copy full definition to clipboard
- **Skeleton loading** — shimmer placeholders instead of spinners
- **Colour-coded POS** — noun (blue), verb (green), adjective (amber), adverb (purple)

### API Server
- **Local HTTP server** on `localhost:17432` — for Vicinae/Raycast extension integration
- Endpoints: `/search`, `/lookup`, `/random`, `/health`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop runtime** | [Tauri v2](https://tauri.app/) (Rust backend) |
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Database** | OEWN 2025 SQLite (bundled, ~161 MB) |
| **DB access** | `rusqlite` with FTS5 full-text search |
| **HTTP server** | `axum` on `127.0.0.1:17432` |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 WordLex Desktop App               │
│                                                   │
│  ┌───────────────────┐   ┌─────────────────────┐  │
│  │  React 19 + TS    │   │   Rust Backend       │  │
│  │  (Vite + TW v4)   │◄──┤  (Tauri v2 cmds)    │  │
│  └───────────────────┘   │                     │  │
│                           │  ┌───────────────┐  │  │
│                           │  │  rusqlite     │  │  │
│                           │  │  OEWN SQLite  │  │  │
│                           │  └───────────────┘  │  │
│                           │                     │  │
│                           │  ┌───────────────┐  │  │
│                           │  │ axum HTTP     │  │  │
│                           │  │ :17432        │  │  │
│                           │  └──────┬────────┘  │  │
│                           └─────────┼───────────┘  │
└───────────────────────────────────  │  ────────────┘
                                      │ REST
                        ┌─────────────▼──────────────┐
                        │   Vicinae/Raycast Extension  │
                        │   (separate repo)            │
                        └──────────────────────────────┘
```

---

## Project Structure

```
wordlex/
├── src-tauri/
│   ├── Cargo.toml              # Rust dependencies
│   ├── build.rs                # Tauri build script
│   ├── tauri.conf.json         # Window, bundle, and app config
│   ├── capabilities/
│   │   └── default.json        # Permission capabilities
│   ├── resources/
│   │   └── oewn.db             # OEWN 2025 SQLite database (not in git)
│   └── src/
│       ├── main.rs             # Rust entry point
│       ├── lib.rs              # App setup, tray, DB init, server spawn
│       ├── models.rs           # Serde structs (WordSense, WordDetail, SearchResult)
│       ├── db.rs               # All SQLite queries (search, lookup, random, FTS5)
│       ├── commands.rs         # Tauri command handlers
│       └── server.rs           # axum HTTP server on :17432
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component (search + detail + history)
│   ├── index.css               # Tailwind v4 design system + CSS variables
│   ├── components/
│   │   ├── TitleBar.tsx        # Custom frameless titlebar + window controls
│   │   ├── SearchBar.tsx       # Autocomplete input + dropdown
│   │   ├── WordDetail.tsx      # Full definition view (grouped by POS)
│   │   ├── SenseCard.tsx       # Single sense card (def + synonyms + examples)
│   │   ├── POSBadge.tsx        # Colour-coded part-of-speech badge
│   │   ├── RelatedWords.tsx    # Clickable chip list (hypernyms, hyponyms)
│   │   ├── EmptyState.tsx      # Landing state with keyboard shortcuts
│   │   └── LoadingSkeleton.tsx # Shimmer skeleton loading state
│   ├── hooks/
│   │   ├── useWordSearch.ts    # Debounced search via Tauri invoke
│   │   ├── useWordDetail.ts    # Full word lookup + random word
│   │   └── useHistory.ts      # Back/forward navigation stack
│   ├── lib/
│   │   └── utils.ts            # cn(), formatPOS(), getPOSColor()
│   └── types/
│       └── index.ts            # TypeScript interfaces mirroring Rust models
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Prerequisites

### System Libraries (Ubuntu/Debian)

```bash
sudo apt install \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libdbus-1-dev \
  pkg-config \
  build-essential
```

### Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Node.js

Node.js >= 20 is required. Install via [nvm](https://github.com/nvm-sh/nvm) or your package manager.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vedesh-padal/wordlex.git
cd wordlex
```

### 2. Download the OEWN database

The database is ~63 MB compressed, ~161 MB uncompressed. It's not stored in git.

```bash
mkdir -p src-tauri/resources

# Download the OEWN 2025 SQLite database
wget -q "https://raw.githubusercontent.com/x-englishwordnet/sqlite/master/oewn-2025-sqlite-2.3.2.sqlite.zip" \
  -O /tmp/oewn.zip

# Extract and place
unzip /tmp/oewn.zip -d /tmp/
mv /tmp/oewn-2025-sqlite-2.3.2.sqlite src-tauri/resources/oewn.db
rm /tmp/oewn.zip
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run in development

```bash
npm run tauri dev
```

This starts both the Vite dev server (frontend HMR on `:1420`) and the Tauri Rust backend.

### 5. Build for distribution

```bash
npm run tauri build
```

Output:
- `src-tauri/target/release/bundle/deb/wordlex_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/wordlex_0.1.0_amd64.AppImage`

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+W` | Open WordLex from anywhere (global) |
| `Ctrl+L` | Focus the search bar |
| `↑` / `↓` | Navigate search results |
| `Enter` | Select highlighted result |
| `Esc` | Clear search / close dropdown |
| `Alt+←` | Go back in history |
| `Alt+→` | Go forward in history |

---

## HTTP API

When running, WordLex exposes a local REST API on `http://127.0.0.1:17432`:

| Endpoint | Method | Description |
|---|---|---|
| `/search?q=<prefix>&limit=<n>` | GET | Prefix search (default limit: 30) |
| `/lookup?word=<word>` | GET | Full word lookup (404 if not found) |
| `/random` | GET | Random interesting word |
| `/health` | GET | Health check + version |

**Example:**

```bash
curl "http://localhost:17432/lookup?word=ephemeral" | jq .
curl "http://localhost:17432/search?q=run&limit=5" | jq .
```

---

## Data Source

This app uses the [Open English WordNet (OEWN)](https://en-word.net/) 2025 edition in SQLite format.

- **152,459 words**, **120,564 synsets**, **212,659 word-sense pairs**
- Free, BSD-like license
- Same underlying lexical data that WordWeb is built on
- Maintained by the [Global WordNet Association](http://globalwordnet.org/)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Notes

- **Rust backend**: All DB queries are in `src-tauri/src/db.rs`. The schema uses integer-based relation IDs (see `relations` table).
- **Frontend**: Components in `src/components/`, hooks in `src/hooks/`. All state flows through `App.tsx`.
- **Theming**: CSS variables defined in `src/index.css`. Both `prefers-color-scheme` and `.dark` class are supported.
- **FTS5**: Created on first run in `db.rs::setup_fts()`. Uses external-content mode pointing at the `words` table.

---

## License

MIT © [Vedesh Padal](https://github.com/vedesh-padal)

---

## Acknowledgments

- [Open English WordNet](https://en-word.net/) — the lexical data
- [Tauri](https://tauri.app/) — the desktop runtime
- [WordWeb](https://wordweb.info/) — the Windows app that inspired this
