import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Interactive-transaction client. Repositories accept `TxClient` so a caller
 * can compose several repository calls into one atomic unit, or pass the
 * default `prisma` for a standalone call.
 */
export type TxClient = Prisma.TransactionClient | typeof prisma;

/**
 * Runs `fn` inside a single database transaction. Use when a write spans
 * multiple tables and must be all-or-nothing (e.g. create workspace +
 * owner member + default conversation + canvas).
 */
export function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5_000,
    timeout: options?.timeout ?? 10_000,
  });
}
