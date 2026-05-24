import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Minus,
  Square,
  X,
  ArrowLeft,
  ArrowRight,
  BookOpen,
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
 */
export function TitleBar({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}: TitleBarProps) {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
  }, [appWindow]);

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
    <div data-tauri-drag-region className="titlebar">
      {/* Left: Logo */}
      <div className="titlebar-group" data-tauri-drag-region>
        <div className="titlebar-brand" style={{ pointerEvents: "none" }}>
          <BookOpen size={16} color="var(--color-ring)" />
          <span>WordLex</span>
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="titlebar-group" data-tauri-drag-region>
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Go back (Alt+←)"
          className="titlebar-btn"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Go forward (Alt+→)"
          className="titlebar-btn"
        >
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Right: Window controls */}
      <div className="titlebar-group">
        <button
          onClick={handleMinimize}
          className="titlebar-btn"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="titlebar-btn"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          className="titlebar-btn close"
          title="Close (hides to tray)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
