const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_EMBED_DIM = 768;

export function geminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function geminiChatModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function geminiEmbedModel(): string {
  return process.env.GEMINI_EMBED_MODEL?.trim() || "gemini-embedding-001";
}

type GeminiPart = { text?: string };
type GeminiResponse = {
  error?: { message?: string };
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  embedding?: { values?: number[] };
  embeddings?: Array<{ values?: number[] }>;
};

function geminiUrl(model: string, method: "generateContent" | "embedContent") {
  const key = geminiApiKey();
  if (!key) return null;
  return `${GEMINI_BASE}/models/${model}:${method}?key=${encodeURIComponent(key)}`;
}

export async function geminiChat(input: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string | null> {
  const url = geminiUrl(geminiChatModel(), "generateContent");
  if (!url) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: "user", parts: [{ text: input.user }] }],
      generationConfig: { temperature: input.temperature ?? 0.2 },
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    console.error("gemini chat failed:", res.status, data.error?.message ?? data);
    return null;
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  return text || null;
}

export async function geminiEmbed(text: string): Promise<number[] | null> {
  const url = geminiUrl(geminiEmbedModel(), "embedContent");
  if (!url) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${geminiEmbedModel()}`,
      content: { parts: [{ text }] },
      outputDimensionality: GEMINI_EMBED_DIM,
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    console.error("gemini embed failed:", res.status, data.error?.message ?? data);
    return null;
  }

  const values = data.embedding?.values ?? data.embeddings?.[0]?.values;
  if (!values || values.length === 0) return null;
  return values;
}
