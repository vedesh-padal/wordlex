import { useState, useCallback } from "react";

/**
 * Hook for back/forward navigation through lookup history.
 *
 * Maintains a stack of looked-up words and a cursor index.
 * push() adds a new word (trimming any forward history).
 * goBack() / goForward() navigate the stack.
 */
export function useHistory() {
  const [stack, setStack] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback(
    (word: string) => {
      setStack((prev) => {
        // If we're not at the end, trim forward history
        const trimmed = prev.slice(0, index + 1);
        // Don't push duplicates consecutively
        if (trimmed[trimmed.length - 1]?.toLowerCase() === word.toLowerCase()) {
          return trimmed;
        }
        return [...trimmed, word];
      });
      setIndex((prev) => prev + 1);
    },
    [index]
  );

  const goBack = useCallback((): string | null => {
    if (index <= 0) return null;
    const newIndex = index - 1;
    setIndex(newIndex);
    return stack[newIndex] ?? null;
  }, [index, stack]);

  const goForward = useCallback((): string | null => {
    if (index >= stack.length - 1) return null;
    const newIndex = index + 1;
    setIndex(newIndex);
    return stack[newIndex] ?? null;
  }, [index, stack]);

  const clear = useCallback(() => {
    setStack([]);
    setIndex(-1);
  }, []);

  const canGoBack = index > 0;
  const canGoForward = index < stack.length - 1;

  return { stack, index, push, goBack, goForward, canGoBack, canGoForward, clear };
}
