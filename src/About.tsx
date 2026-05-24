import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-shell";
import { LogoIcon } from "./components/LogoIcon";

export default function About() {
  useEffect(() => {
    // Basic theme check
    const saved = localStorage.getItem("wordlex-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Auto-focus window
    getCurrentWindow().setFocus();
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "var(--color-bg-base)",
      backgroundImage: "var(--app-bg-gradient)",
      color: "var(--color-text-primary)",
      fontFamily: "var(--font-sans)",
      padding: "2rem",
      textAlign: "center"
    }}>
      <div style={{
        background: "var(--color-surface)",
        padding: "1rem",
        borderRadius: "16px",
        boxShadow: "var(--glass-shadow)",
        border: "1px solid var(--color-border)",
        marginBottom: "1.5rem"
      }}>
        <LogoIcon size={48} color="var(--color-ring)" />
      </div>
      
      <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem", fontWeight: 800, background: "var(--title-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        WordLex
      </h1>
      <p style={{ margin: "0 0 2rem 0", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
        Version 0.1.0
      </p>
      
      <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", lineHeight: 1.5, maxWidth: "250px" }}>
        A native Linux dictionary and thesaurus powered by the Open English WordNet database.
      </p>
      
      <div style={{ marginTop: "auto", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
        <p style={{ marginBottom: "0.5rem" }}>Created by Vedesh Padal</p>
        <button
          onClick={() => open("https://github.com/vedesh-padal/wordlex")}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-ring)",
            cursor: "pointer",
            textDecoration: "underline"
          }}
        >
          View on GitHub
        </button>
      </div>
    </div>
  );
}
