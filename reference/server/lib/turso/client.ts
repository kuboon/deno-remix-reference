/**
 * Turso (libSQL) client for the `/api/turso` sample.
 *
 * Uses `@libsql/client/web` — the pure-fetch/WebSocket build with no native
 * addon — so it runs on Deno and Deno Deploy (edge) as well as locally. The
 * client is created lazily and cached per process; `null` means Turso is not
 * configured (no `TURSO_DATABASE_URL`), which the route surfaces as a clear
 * "not configured" response instead of throwing.
 *
 * NOTE on `@remix-run/data-table`: its sqlite adapter
 * (`createSqliteDatabaseAdapter`) requires a *synchronous* client
 * (`node:sqlite` / `bun:sqlite` shape), so this async remote client cannot be
 * passed to it directly. See lib/turso/README.md.
 */

import { type Client, createClient } from "@libsql/client/web";
import { tursoAuthToken, tursoDatabaseUrl } from "../../config.ts";

let cached: Client | null | undefined;

/** True when a Turso database URL is configured. */
export const isTursoConfigured = (): boolean => Boolean(tursoDatabaseUrl);

/**
 * The shared Turso client, or `null` when unconfigured. Created on first use.
 */
export function getTursoClient(): Client | null {
  if (cached === undefined) {
    cached = tursoDatabaseUrl
      ? createClient({
        url: tursoDatabaseUrl,
        authToken: tursoAuthToken || undefined,
      })
      : null;
  }
  return cached;
}
