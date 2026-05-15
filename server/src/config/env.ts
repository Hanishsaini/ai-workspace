import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Socket-server environment.
 *
 * Loading strategy: the dev script (`tsx watch src/index.ts`) is launched
 * from `server/`, so `../.env.local` is the workspace-root `.env.local`
 * that the Next.js app also reads. Loading order is first-wins:
 *
 *   1. ../.env.local  ← workspace-root local secrets (this is where
 *                       REDIS_URL / SERVICE_TOKEN etc. live for dev)
 *   2. ../.env        ← workspace-root committed defaults
 *   3. ./.env.local   ← server-only overrides (rare)
 *   4. ./.env         ← server-only fallback (rare)
 *
 * In production the hosting platform injects env vars directly into
 * process.env; none of these files will exist and existsSync silently
 * skips them. `override: false` ensures platform-set vars always win.
 */
const candidates = [
  resolve(process.cwd(), "../.env.local"),
  resolve(process.cwd(), "../.env"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
];

const loaded: string[] = [];
for (const path of candidates) {
  if (existsSync(path)) {
    loadEnv({ path, override: false });
    loaded.push(path);
  }
}
if (loaded.length === 0) {
  console.warn(
    "[env] no .env file found — relying on process.env (production behavior)",
  );
} else {
  console.log(`[env] loaded: ${loaded.join(", ")}`);
}

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // No localhost default — if the user forgot to set this we fail loudly
  // instead of silently trying localhost:6379 and producing ECONNREFUSED
  // spam that looks like a remote issue.
  REDIS_URL: z.string().url(),
  REALTIME_TOKEN_SECRET: z
    .string()
    .min(16)
    .default("dev-only-realtime-secret-change!"),
  SERVICE_TOKEN: z
    .string()
    .min(16)
    .default("dev-only-service-token-change!!!"),
  NEXT_API_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid socket-server environment:\n${issues}`);
}

export const env = parsed.data;
