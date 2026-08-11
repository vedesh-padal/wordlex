# WordLex 📖

WordLex is a blisteringly fast, beautifully designed native Linux dictionary and thesaurus. Powered by the incredibly comprehensive Open English WordNet database, WordLex provides instant, 100% offline word lookups right at your fingertips.

![WordLex Screenshot](docs/screenshot.png)

## 🌟 Key Features

- **100% Offline & Instant:** The entire 150,000+ word database runs locally on your machine. Zero loading times, zero internet required.
- **Global Shortcut:** Summon WordLex from anywhere on your desktop by pressing `Alt+W` (configurable in settings!). *X11 sessions only — see [Notes & Limitations](#notes--limitations).*
- **Rich Word Data:** View parts of speech, synonyms, antonyms, examples, and phonetic pronunciations effortlessly.
- **Smart Clipboard Integration:** Copy any word to your clipboard (`Ctrl+C`), press `Alt+W`, and WordLex will automatically open and instantly define the word.
- **Modern Minimalist UI:** Built with React, Vite, and Tauri, featuring a beautiful glassmorphic dark-mode interface.
- **Type-Ahead Search:** Lightning-fast prefix searching powered by an optimized SQLite Full-Text Search (FTS5) index.
- **Powerful CLI:** Use WordLex from the terminal — with colored output, JSON mode for scripting, and random word discovery.
- **Vicinae Integration:** Search the dictionary directly from the [Vicinae](https://github.com/vicinaehq/vicinae) launcher with the [WordLex extension](../wordlex-vicinae).

## 🚀 Installation & Setup

On Linux every path installs the **same WordLex build** — the `.deb`, `.rpm`, and AppImage only differ in packaging. Pick whichever you prefer; you only need one.

### Quick Install (one command)

The installer script picks the native package for your OS/distro automatically (`.deb`, `.rpm`, or `.dmg`), and falls back to the AppImage on Linux when no native package exists.

**Linux / macOS** — in a terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/vedesh-padal/wordlex/main/scripts/install.sh | bash
```

**Windows** — in PowerShell:

```powershell
irm https://raw.githubusercontent.com/vedesh-padal/wordlex/main/scripts/install.ps1 | iex
```

To install a specific version instead of the latest: `VERSION=2.0.0 curl -fsSL … | bash` (or `$env:WORDLEX_VERSION = '2.0.0'` before the PowerShell one-liner).

### Ubuntu / Debian / Linux Mint — `.deb` (recommended)

1. Download `WordLex_2.0.0_amd64.deb` from the [Releases Page](../../releases).
2. Install it:
   ```bash
   sudo apt install ./WordLex_2.0.0_amd64.deb
   ```
3. **WordLex** now appears in your application launcher, with its icon.

<details>
<summary><b>Removing the `.deb` install</b></summary>

The package manager owns the binary, desktop entry, icon, and launcher entry, so removal is a single command:

```bash
sudo dpkg -r word-lex
```

Your search history lives in `~/.local/share/com.wordlex.desktop` and is kept on uninstall; delete that folder too if you want a complete wipe.
</details>

### AppImage (any Linux distro)

<details>
<summary><b>Install</b></summary>

1. Make it executable:
   ```bash
   chmod +x WordLex_2.0.0_amd64.AppImage
   ```
2. Run it directly — or integrate it into the desktop (real icon + menu entry + a `wordlex` command on your PATH):
   ```bash
   ./WordLex_2.0.0_amd64.AppImage --install-cli
   ```
   This is the only way an AppImage gets a proper launcher icon (bare AppImages show a generic icon in the menu/taskbar — an AppImage-wide platform limitation, e.g. also affects Antigravity and t3code).

> Both install paths use the **same desktop entry id** (`WordLex.desktop`), so you always see exactly **one** WordLex entry in the app menu — a user-level entry simply shadows the system one.
</details>

<details>
<summary><b>Removing the AppImage integration</b></summary>

```bash
./WordLex_2.0.0_amd64.AppImage --uninstall-cli
```

This removes the `wordlex` launcher, the desktop entry, and the icon. The AppImage file itself is left in place — delete it when you're done.
</details>

### Fedora / RHEL — `.rpm`

<details>
<summary><b>Install / remove</b></summary>

```bash
sudo dnf install ./WordLex-*.rpm      # or: sudo rpm -ivh ./WordLex-*.rpm
sudo dnf remove word-lex              # or: sudo rpm -e word-lex
```
</details>

### Arch / Manjaro

<details>
<summary><b>Install / remove</b></summary>

No native package — use the [AppImage](#appimage-any-linux-distro) above. Removal is just `--uninstall-cli` plus deleting the file.
</details>

### macOS / Windows

<details>
<summary><b>Install / remove</b></summary>

- **macOS:** open the `.dmg` and drag WordLex into Applications. Remove it by deleting the app from Applications. No CLI-launcher flag needed — the app bundle handles the icon and menu.
- **Windows:** run the `.msi` installer. Remove it via Settings → Apps or the installer's uninstall entry. No CLI-launcher flag needed — the installer adds WordLex to the Start Menu.
</details>

### Build from Source (developers)

If you want to run WordLex from source or contribute to development:

**Prerequisites:**
You need Node.js (v20+ recommended) and the Rust toolchain installed. You also need the system dependencies required by Tauri on Linux:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

**Build Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/vedesh-padal/wordlex.git
cd wordlex

# 2. Install Node dependencies
npm install

# 3. Download the Database
# For WordLex to work, you MUST place the 'oewn.db' SQLite file into the resources folder.
mkdir -p src-tauri/resources
# Download the WordNet zip (~80MB; extracts to a ~168MB .sqlite) and rename the
# extracted file to 'oewn.db'. Do NOT save the zip bytes directly as oewn.db —
# that produces a "file is not a database" error on first launch.
curl -sL "https://raw.githubusercontent.com/x-englishwordnet/sqlite/master/oewn-2025-sqlite-2.3.2.sqlite.zip" -o oewn.zip
unzip -q oewn.zip -d src-tauri/resources/
mv src-tauri/resources/oewn-*.sqlite src-tauri/resources/oewn.db
rm oewn.zip
# Verify it really is a database (must report "SQLite 3.x database"):
file src-tauri/resources/oewn.db

# 4. Run the Development Server
npm run tauri dev
```

## ⌨️ CLI Usage

WordLex includes a full-featured command-line interface. Every `--cli*` and
`--random-json` flag is fully headless — it prints to stdout and exits without
opening the GUI, so it is safe to use in scripts and from the Vicinae extension.

```bash
# Open GUI and search a word
wordlex ephemeral
wordlex --search ephemeral

# Terminal output (colored, no GUI)
wordlex --cli ephemeral

# JSON output (for scripts/tooling, no GUI)
wordlex --cli-json ephemeral       # full word detail as JSON
wordlex --search-json eph          # prefix search results as JSON
wordlex --random-json              # random word as JSON

# Clipboard integration
wordlex --from-clipboard           # read clipboard and search in GUI

# Optional localhost API service (HTTP only, no GUI window)
wordlex --service
```

## 🔌 Vicinae Extension

Search WordLex directly from the [Vicinae](https://github.com/vicinaehq/vicinae) keyboard launcher — without opening the full desktop app.

See the [wordlex-vicinae](https://github.com/vedesh-padal/wordlex-vicinae) extension for installation instructions.

## 🏗️ Architecture & Technical Details

WordLex uses a sophisticated Rust backend to execute highly optimized SQLite queries against the WordNet database, passing the results safely to a React frontend via Tauri commands.

For an in-depth dive into the database schema, query optimizations, Rust application state, and UI architecture, please read the [Technical Details Guide](docs/TECHNICAL_DETAILS.md).

## 📄 License

This project is licensed under the MIT License. The bundled Open English WordNet database operates under its own permissive open-source license.

## ⚠️ Notes & Limitations

### Global Shortcut on Wayland

The global shortcut (`Alt+W`) works only on **X11** sessions (both X11 and mixed "X11 over Wayland" / XWayland setups on KDE, Cinnamon, MATE, etc.). On **Wayland** desktops it does **not** work — this is an operating-system restriction, not a WordLex bug:

- Wayland compositors (GNOME, KDE Plasma Wayland, etc.) deliberately prevent apps from grabbing global keys.
- The only sanctioned path is the XDG **GlobalShortcuts** portal, which refuses to accept any process it cannot identify via a systemd user scope named `app-<app-id>-*.scope` **and** a matching installed `.desktop` file. Apps launched from a terminal (or manually-run AppImages) never satisfy this, and even a correctly-wrapped app only works on distros with a systemd user session — so it is not reliably portable across distros.

Because of this, on Wayland the `Alt+W` setting silently has no effect. As a workaround, copy the word you want (`Ctrl+C`), then launch WordLex and it will pick up the clipboard automatically. A proper Wayland-native solution may land in a future release.

### AppImage Taskbar Icon

A bare AppImage (double-clicked or run directly from the file manager) shows a generic icon in the app launcher and taskbar — an AppImage-wide platform limitation (affects virtually every AppImage, e.g. Antigravity, t3code). **If your distro ships a native package (`.deb` / `.rpm`), prefer it** — it installs the icon and launcher entry system-wide with no extra steps, and the [Quick Install](#quick-install-one-command) script picks it automatically.

If you use the AppImage anyway, integrate it once with `--install-cli` (see [AppImage (any Linux distro)](#appimage-any-linux-distro)). If the icon still doesn't appear after that, refresh the icon cache and log out/in:

```bash
gtk-update-icon-cache -f ~/.local/share/icons/hicolor
```
