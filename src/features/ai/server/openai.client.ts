/**
 * Legacy import path. The AI surface lives in `./ai-service` now and is
 * backed by a provider abstraction (Groq → Gemini → OpenAI → Mock). This
 * shim exists so any straggling imports from `./openai.client` keep working
 * during refactors — prefer `./ai-service` in new code.
 */
export * from "./ai-service";
