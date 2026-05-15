import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/config/env";
import { REALTIME_TOKEN_TTL_SECONDS } from "@/config/constants";

/**
 * Short-lived JWT that authorizes a socket connection to exactly one
 * workspace. Minted by /api/realtime/token after a session + membership
 * check; verified by the socket server's auth middleware. The secret is
 * shared out-of-band between the two deployables.
 */

export interface RealtimeClaims {
  userId: string;
  workspaceId: string;
  name: string | null;
  avatarUrl: string | null;
  cursorColor: string;
}

function secret() {
  return new TextEncoder().encode(getServerEnv().REALTIME_TOKEN_SECRET);
}

export async function signRealtimeToken(
  claims: RealtimeClaims,
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REALTIME_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyRealtimeToken(
  token: string,
): Promise<RealtimeClaims> {
  const { payload } = await jwtVerify(token, secret());
  return {
    userId: payload.userId as string,
    workspaceId: payload.workspaceId as string,
    name: (payload.name as string | null) ?? null,
    avatarUrl: (payload.avatarUrl as string | null) ?? null,
    cursorColor: payload.cursorColor as string,
  };
}
