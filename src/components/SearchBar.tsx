import { useRef, useState, useCallback, useEffect } from "react";
import { Search, Loader2, X, History } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import { POSBadge } from "./POSBadge";
import type { SearchResult } from "../types";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (word: string) => void;
  results: SearchResult[];
  isLoading: boolean;
}

export function SearchBar({
  value,
  onChange,
  onSelect,
  results,
  isLoading,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const hist = await invoke<string[]>("get_history");
      // Filter out empty, get unique items, and take 15 (backend already orders most recent first at index 0)
      const uniqueHist = Array.from(new Set(hist.filter(Boolean)));
      setRecentHistory(uniqueHist.slice(0, 15));
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  }, []);

  useEffect(() => {
    if (isFocused && !value.trim()) {
      fetchHistory();
    }
  }, [isFocused, value, fetchHistory]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isFocused) {
      setIsOpen(results.length > 0 && value.trim().length > 0);
      setSelectedIndex(-1);
    }
  }, [results, value, isFocused]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isShowingResults = isOpen && isFocused && value.trim().length > 0 && results.length > 0;
  const isShowingHistory = isFocused && !value.trim() && recentHistory.length > 0;
  const isDropdownVisible = isShowingResults || isShowingHistory;
  const currentListLength = isShowingResults ? results.length : isShowingHistory ? recentHistory.length : 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Always allow Esc to clear the search if dropdown is closed
      if (e.key === "Escape") {
        e.preventDefault();
        if (isDropdownVisible) {
          setIsOpen(false);
          setIsFocused(false);
          inputRef.current?.blur();
        } else {
          onChange("");
        }
        return;
      }

      if (!isDropdownVisible) {
        if (e.key === "Enter" && value.trim()) {
          onSelect(value.trim());
          setIsFocused(false);
          inputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < currentListLength - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            if (isShowingResults && results[selectedIndex]) {
              onSelect(results[selectedIndex].word);
            } else if (isShowingHistory && recentHistory[selectedIndex]) {
              onSelect(recentHistory[selectedIndex]);
            }
            setIsOpen(false);
            setIsFocused(false);
            inputRef.current?.blur();
          } else if (value.trim()) {
            onSelect(value.trim());
            setIsOpen(false);
            setIsFocused(false);
            inputRef.current?.blur();
          }
          break;
      }
    },
    [isDropdownVisible, selectedIndex, currentListLength, isShowingResults, isShowingHistory, results, recentHistory, value, onSelect, onChange]
  );

  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("[data-result-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        {isLoading ? (
          <Loader2 size={18} className="search-icon animate-spin" style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Search size={18} className="search-icon" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search 150,000+ words..."
          spellCheck={false}
          autoComplete="off"
          className="search-input"
        />

        {value && (
          <button onClick={handleClear} className="titlebar-btn" title="Clear (Esc)">
            <X size={14} />
          </button>
        )}

        <kbd className="kbd-shortcut">Ctrl+L</kbd>
      </div>

      {isDropdownVisible && (
        <div ref={dropdownRef} className="search-dropdown">
          {isShowingResults && results.map((result, i) => (
            <button
              key={`${result.word}-${i}`}
              data-result-item
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(result.word);
                setIsOpen(false);
                setIsFocused(false);
                inputRef.current?.blur();
              }}
              className={`search-result-item ${i === selectedIndex ? 'selected' : ''}`}
            >
              <span className="result-word">{result.word}</span>
              <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                {result.pos_list.map((pos) => (
                  <POSBadge key={pos} pos={pos} size="sm" />
                ))}
              </div>
              <span className="result-def">{result.short_def}</span>
            </button>
          ))}

          {isShowingHistory && recentHistory.map((word, i) => (
            <button
              key={`hist-${word}-${i}`}
              data-result-item
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(word);
                setIsOpen(false);
                setIsFocused(false);
                inputRef.current?.blur();
              }}
              className={`search-result-item ${i === selectedIndex ? 'selected' : ''}`}
            >
              <History size={14} style={{ color: "var(--color-text-muted)", marginRight: "0.5rem" }} />
              <span className="result-word" style={{ opacity: 0.8 }}>{word}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
