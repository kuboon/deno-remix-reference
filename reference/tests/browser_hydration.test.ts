import { assertEquals } from "@std/assert";
import router from "../server/router.ts";

const LIGHTPANDA_HINT =
  "lightpanda が PATH に見つかりません。reference/tests/README.md を参照してインストールしてください。";

function findFreePort(): number {
  const listener = Deno.listen({ port: 0, hostname: "127.0.0.1" });
  const { port } = listener.addr as Deno.NetAddr;
  listener.close();
  return port;
}

async function waitForCdp(cdpPort: number, timeoutMs = 5000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) {
        const json = await res.json();
        return json.webSocketDebuggerUrl as string;
      }
      await res.body?.cancel();
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `lightpanda CDP :${cdpPort} didn't become ready: ${lastError}`,
  );
}

async function ensureLightpanda(): Promise<void> {
  try {
    const { success } = await new Deno.Command("lightpanda", {
      args: ["version"],
      stdout: "null",
      stderr: "null",
    }).output();
    if (!success) throw new Error("lightpanda version exited non-zero");
  } catch {
    throw new Error(LIGHTPANDA_HINT);
  }
}

/**
 * Minimal CDP client — only uses Target + Runtime domains (which lightpanda
 * supports today). Avoids puppeteer-core since it unconditionally calls
 * `Audits.enable` / `Page.*` that lightpanda's CDP doesn't implement yet.
 */
class CdpClient {
  #ws: WebSocket;
  #nextId = 1;
  #pending = new Map<number, {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
  }>();
  #sessionId: string | null = null;

  private constructor(ws: WebSocket) {
    this.#ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data as string);
      if (typeof msg.id === "number") {
        const p = this.#pending.get(msg.id);
        if (!p) return;
        this.#pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    });
  }

  static async connect(wsUrl: string): Promise<CdpClient> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("error", () => reject(new Error("ws error")), {
        once: true,
      });
    });
    return new CdpClient(ws);
  }

  async attachToTarget(targetId: string): Promise<void> {
    const { sessionId } = await this.send<{ sessionId: string }>(
      "Target.attachToTarget",
      { targetId, flatten: true },
    );
    this.#sessionId = sessionId;
  }

  send<T = unknown>(method: string, params: object = {}): Promise<T> {
    const id = this.#nextId++;
    const payload: Record<string, unknown> = { id, method, params };
    if (this.#sessionId) payload.sessionId = this.#sessionId;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.#ws.send(JSON.stringify(payload));
    });
  }

  close(): void {
    this.#ws.close();
  }
}

async function evalInPage<T>(cdp: CdpClient, expression: string): Promise<T> {
  const result = await cdp.send<{
    result: { value?: T; subtype?: string; description?: string };
    exceptionDetails?: { text: string };
  }>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`evaluate failed: ${result.exceptionDetails.text}`);
  }
  return result.result.value as T;
}

async function waitForExpression(
  cdp: CdpClient,
  expression: string,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await evalInPage<boolean>(cdp, `!!(${expression})`);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`timed out waiting for: ${expression}`);
}

Deno.test({
  name: "lightpanda: /hydration の Counter がクリックで +1 される",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    await ensureLightpanda();

    const cdpPort = findFreePort();
    const appPort = findFreePort();

    const lightpanda = new Deno.Command("lightpanda", {
      args: ["serve", "--host", "127.0.0.1", "--port", String(cdpPort)],
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    const app = Deno.serve(
      { port: appPort, hostname: "127.0.0.1", onListen: () => {} },
      (req) => router.fetch(req),
    );

    try {
      const wsUrl = await waitForCdp(cdpPort);

      const browser = await CdpClient.connect(wsUrl);
      try {
        const { targetId } = await browser.send<{ targetId: string }>(
          "Target.createTarget",
          { url: `http://127.0.0.1:${appPort}/hydration` },
        );
        await browser.attachToTarget(targetId);

        await waitForExpression(
          browser,
          "globalThis.__rmxReady === true",
          10000,
        );

        const before = await evalInPage<string>(
          browser,
          `document.querySelector("output").textContent.trim()`,
        );

        await evalInPage<void>(
          browser,
          `document.querySelector('button[aria-label="increment"]').click()`,
        );

        await waitForExpression(
          browser,
          `document.querySelector("output").textContent.trim() !== ${
            JSON.stringify(before)
          }`,
          5000,
        );

        const after = await evalInPage<string>(
          browser,
          `document.querySelector("output").textContent.trim()`,
        );

        assertEquals(Number(after), Number(before) + 1);
      } finally {
        browser.close();
      }
    } finally {
      try {
        lightpanda.kill("SIGTERM");
      } catch { /* already gone */ }
      await lightpanda.status;
      await app.shutdown();
    }
  },
});
