# WordLex 📖

WordLex is a blisteringly fast, beautifully designed native Linux dictionary and thesaurus. Powered by the incredibly comprehensive Open English WordNet database, WordLex provides instant, 100% offline word lookups right at your fingertips.

![WordLex Screenshot](docs/screenshot.png)
*(Note for Vedesh: Place your beautiful UI screenshot image at `docs/screenshot.png` to have it render here!)*

## 🌟 Key Features

- **100% Offline & Instant:** The entire 150,000+ word database runs locally on your machine. Zero loading times, zero internet required.
- **Global Shortcut:** Summon WordLex from anywhere on your desktop by pressing `Alt+W` (configurable in settings!).
- **Rich Word Data:** View parts of speech, synonyms, antonyms, examples, and phonetic pronunciations effortlessly.
- **Smart Clipboard Integration:** Highlight any word in any app, press `Alt+W`, and WordLex will automatically open and instantly define the word you highlighted.
- **Modern Minimalist UI:** Built with React, Vite, and Tauri, featuring a beautiful glassmorphic dark-mode interface.
- **Type-Ahead Search:** Lightning-fast prefix searching powered by an optimized SQLite Full-Text Search (FTS5) index.

## 🚀 Installation & Setup

If you want to run WordLex from source or contribute to development:

### Prerequisites
You need Node.js (v18+) and the Rust toolchain installed on your Linux machine, along with Tauri's system dependencies.

```bash
# 1. Clone the repository
git clone https://github.com/vedesh-padal/wordlex.git
cd wordlex

# 2. Install Node dependencies
npm install

# 3. Download the Database
# For WordLex to work, you MUST place the 'oewn.db' SQLite file into the resources folder.
# Create the directory if it doesn't exist:
mkdir -p src-tauri/resources
# Download the DB (approx 80MB) and place it exactly here:
# src-tauri/resources/oewn.db

# 4. Run the Development Server
npm run tauri dev
```

## 🏗️ Architecture & Technical Details

WordLex uses a sophisticated Rust backend to execute highly optimized SQLite queries against the WordNet database, passing the results safely to a React frontend via Tauri commands.

For an in-depth dive into the database schema, query optimizations, Rust application state, and UI architecture, please read the [Technical Details Guide](TECHNICAL_DETAILS.md).

## 📄 License

This project is licensed under the MIT License. The bundled Open English WordNet database operates under its own permissive open-source license.
