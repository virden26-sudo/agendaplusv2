/** Shared server-side Ollama settings. Use the exact name reported by ollama list. */
export const ollamaModelName = (process.env.OLLAMA_MODEL || "Budd-ie-Standalone").replace(/^ollama\//, "").trim();
export const ollamaModel = `ollama/${ollamaModelName}`;
export const ollamaServerAddress = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");

export async function requireOllamaModel(): Promise<void> {
  const response = await fetch(`${ollamaServerAddress}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Could not list Ollama models (${response.status}).`);
  const payload = await response.json();
  const names: string[] = (payload.models || []).map((model: { name: string }) => model.name);
  const tagged = (name: string) => name.includes(":") ? name : `${name}:latest`;
  if (!names.some(name => tagged(name) === tagged(ollamaModelName))) {
    throw new Error(`Ollama model "${ollamaModelName}" is not installed. Set OLLAMA_MODEL to an exact name from ollama list and restart Agenda+. Available models: ${names.join(", ") || "none"}.`);
  }
}
