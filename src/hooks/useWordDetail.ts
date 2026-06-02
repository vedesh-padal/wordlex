import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WordDetail } from "../types";

/**
 * Hook for full word lookup.
 *
 * Calls the Rust `lookup_word` command and manages loading + error state.
 * The lookup function can be called imperatively from click handlers, etc.
 */
export function useWordDetail() {
  const useServiceApi = import.meta.env.VITE_WORDLEX_USE_SERVICE_API === "1";
  const [word, setWord] = useState<WordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (lemma: string) => {
    if (!lemma.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = useServiceApi
        ? await fetch(
            `http://127.0.0.1:17432/lookup?word=${encodeURIComponent(lemma)}`
          ).then(async (res) => {
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(await res.text());
            return (await res.json()) as WordDetail;
          })
        : await invoke<WordDetail | null>("lookup_word", {
            word: lemma,
          });
      setWord(data);
      if (!data) {
        setError(`No definition found for "${lemma}"`);
      }
    } catch (err) {
      console.error("Lookup failed:", err);
      setError(String(err));
      setWord(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lookupRandom = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = useServiceApi
        ? await fetch("http://127.0.0.1:17432/random").then(async (res) => {
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(await res.text());
            return (await res.json()) as WordDetail;
          })
        : await invoke<WordDetail | null>("get_random_word");
      setWord(data);
    } catch (err) {
      console.error("Random word failed:", err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setWord(null);
    setError(null);
  }, []);

  return { word, isLoading, error, lookup, lookupRandom, clear };
}
