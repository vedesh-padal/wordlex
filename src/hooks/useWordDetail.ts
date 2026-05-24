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
  const [word, setWord] = useState<WordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (lemma: string) => {
    if (!lemma.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await invoke<WordDetail | null>("lookup_word", {
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
      const data = await invoke<WordDetail | null>("get_random_word");
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
