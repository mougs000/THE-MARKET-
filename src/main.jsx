import React from "react";
import ReactDOM from "react-dom/client";
import "./lib/storagePolyfill.js";
import "./index.css";
import TheMarket from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TheMarket />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
