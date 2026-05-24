import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import About from "./About";
import "./index.css";

const isAbout = window.location.hash === "#about";

// Prevent native trackpad pinch-zoom which zooms the entire webview
document.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  },
  { passive: false }
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isAbout ? <About /> : <App />}
  </React.StrictMode>
);
