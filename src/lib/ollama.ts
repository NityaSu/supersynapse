/**
 * Local Ollama helpers shared by embeddings + Ask.
 */

export function ollamaBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434";
  return raw.replace(/\/v1\/?$/, "");
}

export function ollamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL?.trim() || "nomic-embed-text";
}

export function ollamaChatModel(): string {
  return process.env.OLLAMA_MODEL?.trim() || "qwen2.5-coder:7b";
}
