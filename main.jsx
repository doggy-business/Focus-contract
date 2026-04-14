import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

alert("main.jsx loaded");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
