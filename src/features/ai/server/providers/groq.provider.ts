import "server-only";
import Groq from "groq-sdk";
import { getServerEnv } from "@/config/env";
import type { AiProvider, AiStreamInput, AiUsage } from "./types";

/**
 * Groq — the primary free-tier provider. OpenAI-compatible Chat Completions
 * API, very fast inference. Default model: llama-3.3-70b-versatile.
 *
 * The SDK client is created lazily so importing this module never throws
 * when GROQ_API_KEY is absent (the resolver simply won't pick this provider).
 */

let client: Groq | null = null;
function groq(): Groq {
  if (!client) {
    client = new Groq({ apiKey: getServerEnv().GROQ_API_KEY });
  }
  return client;
}

function toMessages(input: AiStreamInput) {
  return [
    { role: "system" as const, content: input.instructions },
    ...input.input.map((t) => ({ role: t.role, content: t.content })),
  ];
}

export function createGroqProvider(): AiProvider {
  const model = getServerEnv().GROQ_MODEL;

  return {
    id: "groq",
    model,

    async *streamCompletion(input) {
      // The groq-sdk TS types don't yet expose `stream_options.include_usage`
      // — we skip per-stream usage on Groq for now (informational only; the
      // orchestrator handles a null `usage` cleanly).
      const stream = await groq().chat.completions.create({
        model,
        messages: toMessages(input),
        stream: true,
        max_tokens: input.maxTokens,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
      const usage: AiUsage | null = null;
      return { usage };
    },

    async generateText(input) {
      const res = await groq().chat.completions.create({
        model,
        messages: toMessages(input),
        stream: false,
        max_tokens: input.maxTokens,
      });
      return res.choices[0]?.message?.content ?? "";
    },
  };
}
