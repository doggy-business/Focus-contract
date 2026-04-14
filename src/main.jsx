import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

try {
  const { default: App } = await import("./App.jsx");
  createRoot(document.getElementById("root")).render(
    <StrictMode><App /></StrictMode>
  );
} catch (e) {
  document.getElementById("root").innerHTML = `
    <div style="background:#080809;color:#E8FF47;padding:40px;font-family:monospace;min-height:100vh">
      <h2>Error loading App</h2>
      <pre style="color:#FF6B47;white-space:pre-wrap;font-size:13px">${e.message}\n\n${e.stack}</pre>
    </div>
  `;
}
