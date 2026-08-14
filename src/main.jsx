import React from "react";
import ReactDOM from "react-dom/client";

function showError(err) {
  const root = document.getElementById("root");
  root.innerHTML =
    '<pre style="color:red;font-family:monospace;font-size:12px;white-space:pre-wrap;padding:16px;">' +
    String(err && err.stack ? err.stack : err) +
    "</pre>";
}

async function start() {
  try {
    await import("./lib/storagePolyfill.js");
    await import("./index.css");
    const { default: TheMarket } = await import("./App.jsx");
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <TheMarket />
      </React.StrictMode>
    );
  } catch (err) {
    showError(err);
  }
}

start();
