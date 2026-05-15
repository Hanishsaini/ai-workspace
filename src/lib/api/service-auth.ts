import type { NextRequest } from "next/server";
import { getServerEnv } from "@/config/env";
import { Errors } from "./errors";

/**
 * Some routes (AI streaming, canvas ops) are called both by browsers (via
 * NextAuth session) and by the socket server on a user's behalf. The socket
 * server presents the shared SERVICE_TOKEN plus an `x-acting-user` header.
 *
 * Returns the acting user id when the request is a trusted service call,
 * or null when it is a normal browser request (caller falls back to session).
 */
export function resolveServiceCaller(req: NextRequest): string | null {
  const token = req.headers.get("x-service-token");
  if (!token) return null;
  if (token !== getServerEnv().SERVICE_TOKEN) {
    throw Errors.unauthorized();
  }
  const actingUser = req.headers.get("x-acting-user");
  if (!actingUser) throw Errors.badRequest("Missing x-acting-user");
  return actingUser;
}
