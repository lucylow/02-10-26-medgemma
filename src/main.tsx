import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

initSentry();

// Prevent MetaMask connection errors from causing unhandled rejection / blank screen.
// These can be triggered by extensions or third-party scripts when no wallet is present or user rejects.
window.addEventListener("unhandledrejection", (event) => {
  const message = typeof event.reason === "string" ? event.reason : (event.reason?.message ?? String(event.reason ?? ""));
  if (
    /Failed to connect to MetaMask|MetaMask|eth_requestAccounts|wallet.*connect/i.test(message) ||
    (event.reason?.stack && /metamask|inpage\.js/i.test(String(event.reason.stack)))
  ) {
    event.preventDefault();
    event.stopPropagation();
    console.warn("[PediScreen] Wallet connection skipped or failed:", message);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
