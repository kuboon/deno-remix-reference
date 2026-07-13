/**
 * Turso (libSQL) sample wired through `@remix-run/data-table`.
 *
 * Uses `@kuboon/remix-data-table-sqlite-turso` — an *asynchronous* SQLite
 * adapter for data-table — so the relational query API works against a remote
 * Turso database. (The upstream `@remix-run/data-table-sqlite` adapter needs a
 * *synchronous* client like `node:sqlite`, which cannot drive remote Turso.)
 *
 * `createTursoDatabase(client)` is the reusable core: pass any `@libsql/client`
 * `Client` (remote, embedded replica, or a local `file:`/`:memory:` client in
 * tests). `getTursoDb()` is the app wrapper that builds a `@libsql/client/web`
 * client from the environment — the fetch/WebSocket build with no native addon,
 * so it runs on Deno Deploy (edge). Returns `null` when Turso is unconfigured.
 */

import { type Client, createClient } from "@libsql/client/web";
import {
  column,
  createDatabase,
  type Database,
  table,
} from "@remix-run/data-table";
import { createTursoDatabaseAdapter } from "@kuboon/remix-data-table-sqlite-turso";

import { getConfig } from "../../config.ts";

/** The `visits` table: one row per request to `/api/turso`. */
export const visits = table({
  name: "visits",
  columns: {
    id: column.integer().primaryKey(),
    at: column.text().notNull(),
  },
});

const CREATE_VISITS =
  "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL)";

export interface TursoDatabase {
  /** data-table handle bound to the Turso adapter. */
  readonly db: Database;
  /** Creates the sample schema on first call (idempotent, cached). */
  ensureSchema(): Promise<void>;
}

/**
 * Build a data-table {@link Database} over the given libSQL client. The client
 * choice (remote / embedded / local) is the caller's — this is what makes the
 * sample testable against an in-memory database.
 */
export function createTursoDatabase(client: Client): TursoDatabase {
  const adapter = createTursoDatabaseAdapter(client);
  const db = createDatabase(adapter);
  let schema: Promise<void> | undefined;
  return {
    db,
    ensureSchema() {
      return (schema ??= adapter.executeScript(CREATE_VISITS));
    },
  };
}

let cached: TursoDatabase | null | undefined;

/**
 * The shared app database, or `null` when unconfigured. Built lazily from the
 * environment using the edge-friendly `@libsql/client/web` client.
 */
export function getTursoDb(): TursoDatabase | null {
  if (cached === undefined) {
    const { tursoDatabaseUrl, tursoAuthToken } = getConfig();
    cached = tursoDatabaseUrl
      ? createTursoDatabase(createClient({
        url: tursoDatabaseUrl,
        authToken: tursoAuthToken || undefined,
      }))
      : null;
  }
  return cached;
}
