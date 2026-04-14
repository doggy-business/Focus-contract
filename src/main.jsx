import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div style={{
      background: "#080809",
      color: "#E8FF47",
      fontFamily: "monospace",
      padding: 40,
      minHeight: "100vh"
    }}>
      <h1>CONTR-ACT.</h1>
      <p>App is loading correctly.</p>
      <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? "✓ Found" : "✗ Missing"}</p>
      <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Found" : "✗ Missing"}</p>
    </div>
  </StrictMode>
);
