import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Minus,
  Square,
  X,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface TitleBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
}

/**
 * Custom frameless titlebar with drag region, navigation, and window controls.
 *
 * The entire bar is a drag region (data-tauri-drag-region), with interactive
 * elements explicitly excluded from dragging.
 */
export function TitleBar({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}: TitleBarProps) {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial maximized state
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});

    // Check initial theme
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const stored = localStorage.getItem("wordlex-theme");
    const dark = stored ? stored === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, [appWindow]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("wordlex-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const handleMinimize = useCallback(() => {
    appWindow.minimize();
  }, [appWindow]);

  const handleMaximize = useCallback(async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  }, [appWindow]);

  const handleClose = useCallback(() => {
    appWindow.close();
  }, [appWindow]);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-11 px-3 select-none shrink-0"
      style={{
        backgroundColor: "var(--color-titlebar)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <BookOpen
          size={16}
          className="text-blue-500"
          style={{ pointerEvents: "none" }}
        />
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--color-titlebar-fg)", pointerEvents: "none" }}
        >
          WordLex
        </span>
      </div>

      {/* Center: Navigation + Theme */}
      <div className="flex items-center gap-1" data-tauri-drag-region>
        <button
          id="btn-nav-back"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Go back (Alt+←)"
          className="p-1.5 rounded-md transition-colors duration-150
                     hover:bg-[var(--color-surface-hover)]
                     disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: "var(--color-titlebar-fg)" }}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          id="btn-nav-forward"
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Go forward (Alt+→)"
          className="p-1.5 rounded-md transition-colors duration-150
                     hover:bg-[var(--color-surface-hover)]
                     disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: "var(--color-titlebar-fg)" }}
        >
          <ArrowRight size={14} />
        </button>

        <div
          className="w-px h-4 mx-1"
          style={{ backgroundColor: "var(--color-border)" }}
        />

        <button
          id="btn-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded-md transition-colors duration-150
                     hover:bg-[var(--color-surface-hover)]"
          style={{ color: "var(--color-titlebar-fg)" }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center">
        <button
          id="btn-minimize"
          onClick={handleMinimize}
          className="flex items-center justify-center w-8 h-8 rounded-md
                     transition-colors duration-150
                     hover:bg-[var(--color-surface-hover)]"
          style={{ color: "var(--color-titlebar-fg)" }}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          id="btn-maximize"
          onClick={handleMaximize}
          className="flex items-center justify-center w-8 h-8 rounded-md
                     transition-colors duration-150
                     hover:bg-[var(--color-surface-hover)]"
          style={{ color: "var(--color-titlebar-fg)" }}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square size={12} />
        </button>
        <button
          id="btn-close"
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-md
                     transition-colors duration-150
                     hover:bg-red-500/20 hover:text-red-500"
          style={{ color: "var(--color-titlebar-fg)" }}
          title="Close (hides to tray)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
