/**
 * Provider abstraction. Every AI backend — Groq, Gemini, OpenAI, and the
 * local Mock — implements this one interface, so the orchestrator never
 * knows or cares which model is answering. Adding a provider is a new file
 * here plus one line in the resolver.
 */

export type AiProviderId = "groq" | "gemini" | "openai" | "mock";

export interface AiTurn {
  role: "user" | "assistant";
  content: string;
}

/** Pre-assembled, already-compressed model input. */
export interface AiStreamInput {
  /** System prompt + rolling summary + canvas digest. */
  instructions: string;
  /** Recent conversation turns, windowed + truncated by the context builder. */
  input: AiTurn[];
  /** Hard cap on completion length — keeps free-tier quota predictable. */
  maxTokens?: number;
}

export interface AiUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly model: string;

  /**
   * Streams the completion token-by-token. The orchestrator fans these
   * deltas out over Redis to every workspace member. Returns final usage.
   */
  streamCompletion(
    input: AiStreamInput,
  ): AsyncGenerator<string, { usage: AiUsage | null }, void>;

  /** Non-streaming completion — used by the summarization/memory layer. */
  generateText(input: AiStreamInput): Promise<string>;
}
