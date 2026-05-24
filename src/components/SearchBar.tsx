import { useRef, useState, useCallback, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setIsOpen(results.length > 0 && value.trim().length > 0);
    setSelectedIndex(-1);
  }, [results, value]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Always allow Esc to clear the search if dropdown is closed
      if (e.key === "Escape") {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          onChange("");
        }
        return;
      }

      if (!isOpen) {
        if (e.key === "Enter" && value.trim()) {
          onSelect(value.trim());
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            onSelect(results[selectedIndex].word);
            setIsOpen(false);
          } else if (value.trim()) {
            onSelect(value.trim());
            setIsOpen(false);
          }
          break;
      }
    },
    [isOpen, selectedIndex, results, value, onSelect, onChange]
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
          onFocus={() => results.length > 0 && setIsOpen(true)}
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

      {isOpen && results.length > 0 && (
        <div ref={dropdownRef} className="search-dropdown">
          {results.map((result, i) => (
            <button
              key={`${result.word}-${i}`}
              data-result-item
              onClick={() => {
                onSelect(result.word);
                setIsOpen(false);
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
        </div>
      )}
    </div>
  );
}
