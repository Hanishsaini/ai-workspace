import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient. Next.js dev hot-reload re-evaluates modules, so we
 * cache the instance on globalThis to avoid exhausting the connection pool.
 *
 * LAZY INITIALIZATION
 * `new PrismaClient()` must not run at module-load time. Next.js's
 * `collect page data` build step imports every route module, and any client
 * that resolves env vars / opens engine state at the top level can fail the
 * build with "Failed to collect page data". The Proxy below defers
 * construction until the first property access — which only happens when a
 * handler actually queries.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function create() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop, receiver) {
    let instance = globalForPrisma.prisma;
    if (!instance) {
      instance = create();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = instance;
      }
    }
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
