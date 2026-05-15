import "server-only";
import { getServerEnv } from "@/config/env";
import type { AiProvider, AiProviderId, AiStreamInput } from "./types";
import { createGroqProvider } from "./groq.provider";
import { createGeminiProvider } from "./gemini.provider";
import { createOpenAiProvider } from "./openai.provider";
import { createMockProvider } from "./mock.provider";

/**
 * Provider resolution + fallback.
 *
 * Selection (preferred order from the free-tier brief):
 *   1. Explicit AI_PROVIDER pinned by env (and key present)
 *   2. Auto: groq → gemini → openai (first available wins)
 *   3. No keys at all → mock (full local demo)
 *
 * When multiple real providers are configured, the primary is wrapped in a
 * FallbackProvider that retries with the secondary IF the primary errors
 * BEFORE yielding the first token. Once tokens are flowing we never switch
 * mid-stream — that would emit duplicates to the room.
 */

function availability() {
  const env = getServerEnv();
  return {
    groq: !!env.GROQ_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
    openai: !!env.OPENAI_API_KEY,
  };
}

function build(id: AiProviderId): AiProvider {
  switch (id) {
    case "groq":
      return createGroqProvider();
    case "gemini":
      return createGeminiProvider();
    case "openai":
      return createOpenAiProvider();
    case "mock":
      return createMockProvider();
  }
}

function pickChain(): AiProviderId[] {
  const env = getServerEnv();
  const have = availability();

  if (env.AI_PROVIDER !== "auto") {
    // Explicit pin. Honor it; only fall through to mock if it's unusable.
    if (env.AI_PROVIDER === "mock") return ["mock"];
    if (have[env.AI_PROVIDER]) {
      // Append the other configured providers as fallback in default order.
      const rest = (["groq", "gemini", "openai"] as const).filter(
        (p) => p !== env.AI_PROVIDER && have[p],
      );
      return [env.AI_PROVIDER, ...rest];
    }
    console.warn(
      `[ai] AI_PROVIDER="${env.AI_PROVIDER}" but no key configured — falling back to auto.`,
    );
  }

  const chain: AiProviderId[] = [];
  if (have.groq) chain.push("groq");
  if (have.gemini) chain.push("gemini");
  if (have.openai) chain.push("openai");
  return chain.length > 0 ? chain : ["mock"];
}

let cached: AiProvider | null = null;
let cachedId: AiProviderId | null = null;

export function resolveAiProvider(): AiProvider {
  if (cached) return cached;
  const chain = pickChain().map(build);
  cached = chain.length > 1 ? new FallbackProvider(chain) : chain[0];
  cachedId = chain[0].id;
  console.log(
    `[ai] using provider: ${chain.map((p) => `${p.id}(${p.model})`).join(" → ")}`,
  );
  return cached;
}

/** For diagnostics + storing model name on AiRun. */
export function aiProviderInfo() {
  const p = resolveAiProvider();
  return { id: p.id, model: p.model, primary: cachedId ?? p.id };
}

/**
 * Wraps an ordered list of providers. Falls back to the next provider only
 * when the current one fails BEFORE yielding any tokens — keeps the shared
 * stream coherent and never causes the room to see two competing answers.
 */
class FallbackProvider implements AiProvider {
  readonly id: AiProviderId;
  readonly model: string;

  constructor(private readonly chain: AiProvider[]) {
    this.id = chain[0].id;
    this.model = chain[0].model;
  }

  async *streamCompletion(input: AiStreamInput) {
    let lastErr: unknown;
    for (const provider of this.chain) {
      let yielded = false;
      try {
        const gen = provider.streamCompletion(input);
        let r = await gen.next();
        while (!r.done) {
          yielded = true;
          yield r.value;
          r = await gen.next();
        }
        return r.value;
      } catch (err) {
        lastErr = err;
        if (yielded) {
          // Already streamed to the room — must not retry, would duplicate.
          throw err;
        }
        console.warn(
          `[ai] ${provider.id} failed before first token, trying next:`,
          err,
        );
      }
    }
    throw lastErr ?? new Error("All AI providers unavailable");
  }

  async generateText(input: AiStreamInput) {
    let lastErr: unknown;
    for (const provider of this.chain) {
      try {
        return await provider.generateText(input);
      } catch (err) {
        lastErr = err;
        console.warn(`[ai] ${provider.id} generateText failed:`, err);
      }
    }
    throw lastErr ?? new Error("All AI providers unavailable");
  }
}

export type { AiProvider, AiProviderId, AiStreamInput } from "./types";
