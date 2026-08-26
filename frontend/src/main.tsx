import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { applyDesignScale } from "./app/designScale";
import "./styles/global.css";
import "./styles/design-tokens.css";
import "./styles/app.css";
import "./styles/design-system.css";

applyDesignScale();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
