import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useDebouncedCallback } from "use-debounce";
import type { SearchResult } from "../types";

/**
 * Hook for debounced word search.
 *
 * Calls the Rust `search_words` command with a 200ms debounce to avoid
 * hammering the DB on every keystroke. Returns the latest results and
 * loading state.
 */
export function useWordSearch() {
  const useServiceApi = import.meta.env.VITE_WORDLEX_USE_SERVICE_API === "1";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = useServiceApi
        ? await fetch(
            `http://127.0.0.1:17432/search?q=${encodeURIComponent(q)}&limit=50`
          ).then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
        : await invoke<SearchResult[]>("search_words", { query: q });
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 200);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return { query, setQuery, results, isLoading };
}
