import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { TitleBar } from "./components/TitleBar";
import { SearchBar } from "./components/SearchBar";
import { WordDetailView } from "./components/WordDetail";
import { EmptyState } from "./components/EmptyState";
import { LoadingSkeleton } from "./components/LoadingSkeleton";

import { useWordSearch } from "./hooks/useWordSearch";
import { useWordDetail } from "./hooks/useWordDetail";
import { useHistory } from "./hooks/useHistory";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Root application component.
 *
 * Orchestrates search, word detail, and navigation history.
 * Listens for Tauri events (show-random-word from tray menu).
 * Handles keyboard shortcuts (Alt+←/→ for history).
 */
export default function App() {
  const search = useWordSearch();
  const detail = useWordDetail();
  const history = useHistory();

  // Handle word selection from search or cross-reference clicks
  const handleWordSelect = useCallback(
    (word: string) => {
      search.setQuery(word);
      detail.lookup(word);
      history.push(word);
    },
    [search, detail, history]
  );

  // Handle back/forward navigation
  const handleGoBack = useCallback(() => {
    const word = history.goBack();
    if (word) {
      search.setQuery(word);
      detail.lookup(word);
    }
  }, [history, search, detail]);

  const handleGoForward = useCallback(() => {
    const word = history.goForward();
    if (word) {
      search.setQuery(word);
      detail.lookup(word);
    }
  }, [history, search, detail]);

  // Listen for "show-random-word" event from tray menu
  useEffect(() => {
    const unlisten = listen("show-random-word", () => {
      detail.lookupRandom();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [detail]);

  // Global hotkey & quick lookup
  useEffect(() => {
    let isRegistered = false;
    
    const setupShortcut = async () => {
      try {
        await unregisterAll();
        await register("Alt+W", async (event) => {
          if (event.state === "Pressed") {
            const window = getCurrentWindow();
            await window.show();
            await window.setFocus();

            try {
              const clipText = await readText();
              if (clipText && clipText.trim().length > 0 && clipText.trim().length < 30) {
                // If it's a single word or short phrase, auto-search
                const sanitized = clipText.trim();
                search.setQuery(sanitized);
                detail.lookup(sanitized);
                history.push(sanitized);
              }
            } catch (err) {
              console.warn("Failed to read clipboard:", err);
            }
          }
        });
        isRegistered = true;
      } catch (err) {
        console.error("Failed to register shortcut:", err);
      }
    };

    setupShortcut();

    return () => {
      if (isRegistered) {
        unregisterAll().catch(console.error);
      }
    };
  }, [search, detail, history]);

  // Keyboard shortcuts
  useEffect(() => {
    let currentZoom = 100;
    
    const handler = (e: KeyboardEvent) => {
      // Alt+← / Alt+→ for history navigation
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleGoForward();
      }
      
      // Ctrl++ / Ctrl+- for Zooming
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          currentZoom = Math.min(currentZoom + 10, 150);
          document.documentElement.style.fontSize = `${currentZoom}%`;
        } else if (e.key === "-") {
          e.preventDefault();
          currentZoom = Math.max(currentZoom - 10, 70);
          document.documentElement.style.fontSize = `${currentZoom}%`;
        } else if (e.key === "0") {
          e.preventDefault();
          currentZoom = 100;
          document.documentElement.style.fontSize = "100%";
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGoBack, handleGoForward]);

  const handleGoHome = useCallback(() => {
    search.setQuery("");
    detail.clear();
  }, [search, detail]);

  return (
    <div className="app-container">
      <TitleBar
        canGoBack={history.canGoBack}
        canGoForward={history.canGoForward}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onHome={handleGoHome}
      />

      <SearchBar
        value={search.query}
        onChange={search.setQuery}
        onSelect={handleWordSelect}
        results={search.results}
        isLoading={search.isLoading}
      />

      {/* Main content area */}
      <div className="content-area">
        {detail.isLoading ? (
          <LoadingSkeleton />
        ) : detail.word ? (
          <WordDetailView word={detail.word} onWordClick={handleWordSelect} />
        ) : detail.error ? (
          <div className="empty-state">
            <p className="empty-desc">{detail.error}</p>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
