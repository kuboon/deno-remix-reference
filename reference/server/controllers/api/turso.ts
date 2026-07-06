/**
 * GET /api/turso — minimal Turso (libSQL) sample.
 *
 * Records a "visit" in a Turso database and returns the running total plus the
 * most recent timestamps. Demonstrates connecting to Turso from the server via
 * `@libsql/client` using config read from the environment
 * (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`). Returns 503 when unconfigured so
 * the app still runs without a database.
 */

import type { Action } from "@remix-run/fetch-router";
import type { routes } from "../../routes.ts";
import { getTursoClient } from "../../lib/turso/client.ts";

export const tursoAction = {
  async handler(): Promise<Response> {
    const client = getTursoClient();
    if (!client) {
      return Response.json({
        configured: false,
        message:
          "Turso is not configured. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) to enable this sample.",
      }, { status: 503 });
    }

    try {
      // A single round-trip batch: ensure the table, record this visit, then
      // read back the total and the latest few timestamps.
      await client.batch([
        "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL)",
        {
          sql: "INSERT INTO visits (at) VALUES (?)",
          args: [new Date().toISOString()],
        },
      ], "write");

      const [countResult, recentResult] = await client.batch([
        "SELECT COUNT(*) AS total FROM visits",
        "SELECT at FROM visits ORDER BY id DESC LIMIT 5",
      ], "read");

      const total = Number(countResult.rows[0]?.total ?? 0);
      const recent = recentResult.rows.map((row) => String(row.at));

      return Response.json({ configured: true, total, recent });
    } catch (error) {
      return Response.json({
        message: error instanceof Error ? error.message : "Turso query failed",
      }, { status: 502 });
    }
  },
} satisfies Action<typeof routes.turso>;
