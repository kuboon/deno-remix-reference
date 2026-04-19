/**
 * DPoP demo client — runs in the browser.
 *
 * Uses @scope/dpop/client.ts to:
 * - Generate (or load from IndexedDB) an ECDSA P-256 key pair
 * - Compute the JWK SHA-256 thumbprint
 * - Expose `fetchDpop` that attaches a DPoP proof to every request
 *
 * Built with `deno bundle --platform browser` into reference/public/demo.js
 * and loaded by the /demo page as `<script type="module" src="/demo.js">`.
 */

import { init } from "@scope/dpop/client.ts";

const log = document.getElementById("log")!;
const thumbprintEl = document.getElementById("thumbprint")!;

function appendLog(msg: string, cls?: string) {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = msg;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// Initialize DPoP client: generates or loads a key pair and returns fetchDpop + thumbprint.
const { fetchDpop, thumbprint } = await init();
thumbprintEl.textContent = thumbprint;
appendLog(`鍵ペアを初期化しました。Thumbprint: ${thumbprint}`, "success");

async function callApi(method: string, body?: unknown) {
  const url = "/api/protected";
  appendLog(`→ ${method} ${url}${body ? " " + JSON.stringify(body) : ""}`);
  try {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const res = await fetchDpop(url, init);
    const json = await res.json();
    appendLog(
      `← ${res.status} ${JSON.stringify(json, null, 2)}`,
      res.ok ? "success" : "error",
    );
  } catch (e) {
    appendLog(`Error: ${(e as Error).message}`, "error");
  }
}

document.getElementById("btn-get")!.addEventListener("click", () => {
  callApi("GET");
});

document.getElementById("btn-post")!.addEventListener("click", () => {
  callApi("POST", { name: "Alice", timestamp: new Date().toISOString() });
});

document.getElementById("btn-post2")!.addEventListener("click", () => {
  callApi("POST", {
    name: "Bob",
    role: "admin",
    timestamp: new Date().toISOString(),
  });
});

document.getElementById("btn-clear")!.addEventListener("click", () => {
  log.innerHTML = "";
});
