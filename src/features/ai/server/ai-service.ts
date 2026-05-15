import "server-only";
import type { AiStreamInput } from "./providers/types";
import { aiProviderInfo, resolveAiProvider } from "./providers";

/**
 * Public AI surface. The orchestrator, summarizer, and any future callers
 * import from here — never from a specific provider — so swapping Groq for
 * Gemini for OpenAI is one env flip with zero code change.
 */

export type { AiStreamInput, AiTurn, AiUsage } from "./providers/types";
export { aiProviderInfo };

/** Streams a completion token-by-token; tokens flow through the orchestrator's
 *  StreamBuffer → Redis fan-out → both workspace members. */
export function streamCompletion(input: AiStreamInput) {
  return resolveAiProvider().streamCompletion(input);
}

/** Non-streaming completion. Used by the summarization layer. */
export function generateText(input: AiStreamInput): Promise<string> {
  return resolveAiProvider().generateText(input);
}
