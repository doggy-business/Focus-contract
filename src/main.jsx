import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

window.onerror = (msg, src, line, col, err) => {
  document.body.style.background = "#0D0D0F";
  document.body.style.color = "#E8FF47";
  document.body.style.fontFamily = "monospace";
  document.body.style.padding = "24px";
  document.body.innerHTML = `<h2>Error</h2><pre style="white-space:pre-wrap;font-size:13px;color:#fff">${msg}\n\n${err?.stack || ""}</pre>`;
};

window.onunhandledrejection = (e) => {
  document.body.style.background = "#0D0D0F";
  document.body.style.color = "#E8FF47";
  document.body.style.fontFamily = "monospace";
  document.body.style.padding = "24px";
  document.body.innerHTML = `<h2>Unhandled Promise Error</h2><pre style="white-space:pre-wrap;font-size:13px;color:#fff">${e.reason?.message}\n\n${e.reason?.stack || ""}</pre>`;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
