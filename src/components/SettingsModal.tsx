import { X, Keyboard, Database, History, RefreshCw, Trash2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShortcut: string;
  onShortcutChange: (newShortcut: string) => void;
  onClearHistory: () => void;
}

export function SettingsModal({ isOpen, onClose, currentShortcut, onShortcutChange, onClearHistory }: SettingsModalProps) {
  const [shortcutInput, setShortcutInput] = useState(currentShortcut);
  const [isRecording, setIsRecording] = useState(false);
  const [dbStatus, setDbStatus] = useState<"idle" | "updating" | "success">("idle");
  const [historyStatus, setHistoryStatus] = useState<"idle" | "success">("idle");

  useEffect(() => {
    setShortcutInput(currentShortcut);
  }, [currentShortcut, isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();

    const keys = [];
    if (e.ctrlKey) keys.push("Ctrl");
    if (e.altKey) keys.push("Alt");
    if (e.shiftKey) keys.push("Shift");
    if (e.metaKey) keys.push("Command");

    if (e.key !== "Control" && e.key !== "Alt" && e.key !== "Shift" && e.key !== "Meta") {
      keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const newShortcut = keys.join("+");
      setShortcutInput(newShortcut);
      onShortcutChange(newShortcut);
      setIsRecording(false);
    }
  };

  const handleUpdateDb = () => {
    setDbStatus("updating");
    // Simulate DB update check
    setTimeout(() => {
      setDbStatus("success");
      setTimeout(() => setDbStatus("idle"), 3000);
    }, 1500);
  };

  const handleClearHistory = () => {
    invoke("clear_history").then(() => {
      onClearHistory();
      setHistoryStatus("success");
      setTimeout(() => setHistoryStatus("idle"), 2000);
    }).catch(console.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <div className="settings-section-header">
              <Keyboard size={16} />
              <h3>Global Shortcut</h3>
            </div>
            <p className="settings-desc">The keyboard shortcut used to summon WordLex from anywhere.</p>
            <button 
              className={`shortcut-recorder ${isRecording ? "recording" : ""}`}
              onClick={() => setIsRecording(true)}
              onKeyDown={handleKeyDown}
            >
              {isRecording ? "Press keys..." : shortcutInput}
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <History size={16} />
              <h3>Search History</h3>
            </div>
            <p className="settings-desc">WordLex saves your recent searches for quick navigation.</p>
            <button 
              className="settings-action-btn danger" 
              onClick={handleClearHistory}
              disabled={historyStatus === "success"}
            >
              {historyStatus === "success" ? <><Check size={14} /> Cleared</> : <><Trash2 size={14} /> Clear History</>}
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <Database size={16} />
              <h3>Dictionary Database</h3>
            </div>
            <div className="db-info">
              <div className="db-info-row"><span>Source:</span> Open English WordNet</div>
              <div className="db-info-row"><span>Words:</span> ~150,000+</div>
              <div className="db-info-row"><span>Status:</span> Local, Offline</div>
            </div>
            <button 
              className="settings-action-btn" 
              onClick={handleUpdateDb}
              disabled={dbStatus !== "idle"}
            >
              {dbStatus === "updating" ? <><RefreshCw size={14} className="spin" /> Checking...</> : 
               dbStatus === "success" ? <><Check size={14} /> Up to date</> : 
               <><RefreshCw size={14} /> Check for Updates</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
