/**
 * DPoP session loading shared by the navbar (NavAuth) and the /my page
 * (SignInCard).
 *
 * `loadDpopSession()` generates/reuses this browser's DPoP key, then probes the
 * IdP's `/session` endpoint with a DPoP-bound request. `userId` is non-null
 * when the IdP has a session bound to this browser's thumbprint.
 */

import { init } from "@kuboon/dpop";

export type FetchDpop = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface DpopSession {
  fetchDpop: FetchDpop;
  thumbprint: string;
  userId: string | null;
}

export async function loadDpopSession(idpOrigin: string): Promise<DpopSession> {
  const { fetchDpop, thumbprint } = await init();
  const response = await fetchDpop(`${idpOrigin}/session`);
  const session = response.ok
    ? (await response.json()) as { userId: string | null }
    : null;
  return { fetchDpop, thumbprint, userId: session?.userId ?? null };
}
