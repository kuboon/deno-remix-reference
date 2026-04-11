/**
 * Replay detection for DPoP proofs.
 *
 * Tracks seen `jti` values to prevent proof reuse.
 * The interface is pluggable — production deployments can swap in
 * Redis, Deno KV, or any distributed store.
 */

export interface ReplayDetector {
  /** Returns true if this jti has been seen before (replay detected). */
  seen(jti: string, thumbprint: string): Promise<boolean>;
  /** Mark a jti as used. */
  markUsed(jti: string, thumbprint: string, expiresAt: Date): Promise<void>;
}

interface Entry {
  expiresAt: number;
}

/**
 * In-memory replay detector backed by a Map.
 * Suitable for single-process development/demo servers.
 */
export class InMemoryReplayDetector implements ReplayDetector {
  private store = new Map<string, Entry>();
  private cleanupIntervalId: number | undefined;

  constructor(cleanupIntervalMs = 60_000) {
    this.cleanupIntervalId = setInterval(
      () => this.cleanup(),
      cleanupIntervalMs,
    ) as unknown as number;
    // Don't block Deno from exiting
    if (typeof Deno !== "undefined") {
      Deno.unrefTimer(this.cleanupIntervalId);
    }
  }

  private key(jti: string, thumbprint: string): string {
    return `${thumbprint}:${jti}`;
  }

  async seen(jti: string, thumbprint: string): Promise<boolean> {
    const k = this.key(jti, thumbprint);
    const entry = this.store.get(k);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(k);
      return false;
    }
    return true;
  }

  async markUsed(
    jti: string,
    thumbprint: string,
    expiresAt: Date,
  ): Promise<void> {
    this.store.set(this.key(jti, thumbprint), {
      expiresAt: expiresAt.getTime(),
    });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  /** Dispose of the cleanup timer. */
  dispose(): void {
    if (this.cleanupIntervalId !== undefined) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }
}
