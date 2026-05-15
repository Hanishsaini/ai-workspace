import "server-only";
import type { AiProvider, AiStreamInput, AiUsage } from "./types";

/**
 * Mock provider — the zero-cost default. Selected automatically when no AI
 * key is configured, so the entire product (realtime fan-out, shared
 * streaming, incremental persistence, summarization) is fully demoable with
 * no paid services and no signup.
 *
 * It synthesizes a plausible, structured response that references the user's
 * actual prompt, then streams it word-by-word with a small delay so the
 * collaborative streaming experience is identical to a real provider.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Word-ish chunks (word + trailing space) — mimics real token deltas. */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

function lastUserPrompt(input: AiStreamInput): string {
  for (let i = input.input.length - 1; i >= 0; i--) {
    if (input.input[i].role === "user") return input.input[i].content;
  }
  return "";
}

/** A short topic phrase pulled from the prompt, for echoing back naturally. */
function topicOf(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "that";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length < cleaned.length ? `${words}…` : words;
}

function buildMockResponse(input: AiStreamInput): string {
  const prompt = lastUserPrompt(input);
  const topic = topicOf(prompt);
  const isQuestion = /\?\s*$/.test(prompt.trim());

  if (isQuestion) {
    return [
      `Good question about "${topic}". Here's how I'd think about it:`,
      ``,
      `- Start by clarifying the goal and the constraints you're working within.`,
      `- Break the problem into the smallest pieces that can be verified independently.`,
      `- Prefer the simplest approach that satisfies the requirement, then iterate.`,
      ``,
      `If you share a bit more context, I can go deeper on the specifics — but that framing should get both of you moving in the same direction.`,
    ].join("\n");
  }

  return [
    `Here's a take on "${topic}":`,
    ``,
    `The core idea is to keep the moving parts minimal and the feedback loop tight. A few concrete next steps:`,
    ``,
    `1. Capture the intent in one or two sentences so everyone in the workspace shares the same picture.`,
    `2. Sketch the smallest version that proves the concept end to end.`,
    `3. Note open questions in the shared notes panel so they don't get lost.`,
    ``,
    `Drop more detail in and I'll refine this with you.`,
  ].join("\n");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function createMockProvider(): AiProvider {
  return {
    id: "mock",
    model: "mock-llm",

    async *streamCompletion(input) {
      const text = buildMockResponse(input);
      const tokens = tokenize(text);

      for (const token of tokens) {
        // ~20ms/word ≈ a brisk but human-readable stream.
        await sleep(18 + Math.random() * 22);
        yield token;
      }

      const usage: AiUsage = {
        promptTokens: estimateTokens(
          input.instructions + input.input.map((t) => t.content).join(" "),
        ),
        completionTokens: estimateTokens(text),
      };
      return { usage };
    },

    async generateText(input) {
      // Used by the summarizer — return a terse stand-in summary.
      const prompt = lastUserPrompt(input);
      return `Summary (mock): the conversation has covered ${topicOf(
        prompt,
      )} and related follow-ups. Key decisions and open questions are tracked in the workspace.`;
    },
  };
}
