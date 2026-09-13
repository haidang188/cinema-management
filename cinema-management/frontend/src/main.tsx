import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// @ts-expect-error - CSS imports are handled by Vite's type declarations.
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element not found");
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);