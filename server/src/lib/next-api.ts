import { env } from "../config/env.js";

/**
 * Server-to-server calls into the Vercel API tier. The socket server holds
 * NO business logic — when a client submits a prompt or a canvas op, we
 * forward it here so auth, persistence, AI orchestration, and broadcasting
 * all stay in one place. Authenticated with the shared SERVICE_TOKEN.
 */
export async function callNextApi(
  path: string,
  body: unknown,
  actingUserId: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(`${env.NEXT_API_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-service-token": env.SERVICE_TOKEN,
        "x-acting-user": actingUserId,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`[next-api] ${path} failed:`, err);
    return { ok: false, status: 502, data: null };
  }
}
