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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Alt+← / Alt+→ for history navigation
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleGoForward();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGoBack, handleGoForward]);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <TitleBar
        canGoBack={history.canGoBack}
        canGoForward={history.canGoForward}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
      />

      <SearchBar
        value={search.query}
        onChange={search.setQuery}
        onSelect={handleWordSelect}
        results={search.results}
        isLoading={search.isLoading}
      />

      {/* Main content area */}
      {detail.isLoading ? (
        <LoadingSkeleton />
      ) : detail.word ? (
        <WordDetailView word={detail.word} onWordClick={handleWordSelect} />
      ) : detail.error ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <p
            className="text-sm text-center"
            style={{ color: "var(--color-fg-muted)" }}
          >
            {detail.error}
          </p>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
