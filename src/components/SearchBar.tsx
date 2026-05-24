import { useRef, useState, useCallback, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn, formatPOS, getPOSColor } from "../lib/utils";
import type { SearchResult } from "../types";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (word: string) => void;
  results: SearchResult[];
  isLoading: boolean;
}

/**
 * Autocomplete search bar with dropdown results.
 *
 * Features:
 * - Auto-focus on mount
 * - Keyboard navigation (↑/↓ to navigate, Enter to select, Esc to clear)
 * - Loading spinner
 * - Clear button
 * - POS badges in dropdown results
 */
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

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Open dropdown when there are results
  useEffect(() => {
    setIsOpen(results.length > 0 && value.trim().length > 0);
    setSelectedIndex(-1);
  }, [results, value]);

  // Global keyboard shortcut: Ctrl+L focuses search
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
        case "Escape":
          e.preventDefault();
          if (isOpen) {
            setIsOpen(false);
          } else {
            onChange("");
          }
          break;
      }
    },
    [isOpen, selectedIndex, results, value, onSelect, onChange]
  );

  // Scroll selected item into view
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
    <div className="relative px-3 py-2 shrink-0">
      {/* Search input */}
      <div
        className="flex items-center gap-2 px-3 h-10 rounded-lg
                    transition-all duration-200 border"
        style={{
          backgroundColor: "var(--color-search-bg)",
          borderColor: isOpen
            ? "var(--color-search-focus)"
            : "var(--color-search-border)",
          boxShadow: isOpen
            ? "0 0 0 3px var(--color-ring) / 0.12"
            : "none",
        }}
      >
        {isLoading ? (
          <Loader2
            size={16}
            className="shrink-0 animate-spin"
            style={{ color: "var(--color-fg-muted)" }}
          />
        ) : (
          <Search
            size={16}
            className="shrink-0"
            style={{ color: "var(--color-fg-muted)" }}
          />
        )}

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search for a word..."
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent border-none outline-none
                     text-sm placeholder:text-[var(--color-fg-muted)]"
          style={{ color: "var(--color-fg)" }}
        />

        {value && (
          <button
            onClick={handleClear}
            className="shrink-0 p-0.5 rounded transition-colors duration-150
                       hover:bg-[var(--color-surface-hover)]"
            style={{ color: "var(--color-fg-muted)" }}
            title="Clear (Esc)"
          >
            <X size={14} />
          </button>
        )}

        <kbd
          className="hidden sm:inline-flex items-center px-1.5 py-0.5
                      text-[10px] font-medium rounded border shrink-0"
          style={{
            color: "var(--color-fg-muted)",
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
          }}
        >
          Ctrl+L
        </kbd>
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-3 right-3 top-full mt-1 z-50
                     rounded-lg border overflow-hidden
                     animate-slide-down"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow:
              "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {results.map((result, i) => (
            <button
              key={`${result.word}-${i}`}
              data-result-item
              onClick={() => {
                onSelect(result.word);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left",
                "transition-colors duration-100 border-b last:border-b-0",
                i === selectedIndex
                  ? "bg-[var(--color-surface-active)]"
                  : "hover:bg-[var(--color-surface-hover)]"
              )}
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              {/* Word */}
              <span
                className="font-medium text-sm shrink-0"
                style={{ color: "var(--color-fg)" }}
              >
                {result.word}
              </span>

              {/* POS badges */}
              <div className="flex items-center gap-1 shrink-0">
                {result.pos_list.map((pos) => {
                  const color = getPOSColor(pos);
                  return (
                    <span
                      key={pos}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                        color.bg,
                        color.text
                      )}
                    >
                      {formatPOS(pos)}
                    </span>
                  );
                })}
              </div>

              {/* Short definition */}
              <span
                className="text-xs truncate flex-1 min-w-0"
                style={{ color: "var(--color-fg-muted)" }}
              >
                {result.short_def}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
