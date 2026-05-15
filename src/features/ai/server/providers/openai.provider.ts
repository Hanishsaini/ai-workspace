import "server-only";
import OpenAI from "openai";
import { getServerEnv } from "@/config/env";
import type { AiProvider, AiStreamInput, AiUsage } from "./types";

/**
 * OpenAI — optional, paid. Included so the abstraction is proven against a
 * third backend and OpenAI is a genuine drop-in: set OPENAI_API_KEY and
 * AI_PROVIDER=openai, nothing else changes. Uses Chat Completions for
 * uniformity with the other providers.
 */

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getServerEnv().OPENAI_API_KEY });
  }
  return client;
}

function toMessages(input: AiStreamInput) {
  return [
    { role: "system" as const, content: input.instructions },
    ...input.input.map((t) => ({ role: t.role, content: t.content })),
  ];
}

export function createOpenAiProvider(): AiProvider {
  const model = getServerEnv().OPENAI_MODEL;

  return {
    id: "openai",
    model,

    async *streamCompletion(input) {
      const stream = await openai().chat.completions.create({
        model,
        messages: toMessages(input),
        stream: true,
        max_tokens: input.maxTokens,
        stream_options: { include_usage: true },
      });

      let usage: AiUsage | null = null;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
          };
        }
      }
      return { usage };
    },

    async generateText(input) {
      const res = await openai().chat.completions.create({
        model,
        messages: toMessages(input),
        stream: false,
        max_tokens: input.maxTokens,
      });
      return res.choices[0]?.message?.content ?? "";
    },
  };
}
