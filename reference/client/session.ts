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
  // `thumbprint` comes from the DPoP key itself and must survive a failing
  // `/session` probe — when signed out the cross-origin request can 401 or
  // reject, and callers still need the thumbprint to start the sign-in flow.
  const { fetchDpop, thumbprint } = await init();
  let userId: string | null = null;
  try {
    const response = await fetchDpop(`${idpOrigin}/session`);
    if (response.ok) {
      const session = (await response.json()) as { userId: string | null };
      userId = session.userId ?? null;
    }
  } catch {
    userId = null;
  }
  return { fetchDpop, thumbprint, userId };
}
