import type { Memory } from "@/lib/memories";
import type { Space } from "@/lib/spaces";
import type { SearchMode } from "@/lib/types";

export type CaptureFact = {
  id: string;
  content: string;
  isLatest: boolean;
  createdAt: string;
  relation: "updates" | "extends" | null;
  replaces: { id: string; content: string } | null;
};

export type CaptureResult =
  | { ok: true; facts: CaptureFact[]; extracted: number }
  | { ok: false; error: string };

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== "undefined") {
    // A full document load, not a client transition: the session is gone, so we
    // want cached client state discarded and the auth proxy to see the request.
    window.location.href = new URL("/login", window.location.origin).toString();
  }
  return (await res.json()) as T;
}

function asMemory(row: Partial<Memory> & Pick<Memory, "id" | "content">): Memory {
  return {
    id: row.id,
    content: row.content,
    containerTag: row.containerTag ?? "default",
    createdAt: row.createdAt ?? new Date().toISOString(),
    score: row.score,
    isLatest: row.isLatest,
    documentId: row.documentId,
    relation: row.relation ?? null,
    replaces: row.replaces ?? null,
    source: row.source ?? "notebook",
  };
}

export async function getSpaces(): Promise<Space[]> {
  const res = await fetch("/api/spaces");
  const data = await readJson<{ spaces?: Space[] }>(res);
  return data.spaces ?? [];
}

export async function createSpace(name: string): Promise<
  { ok: true; space: Space } | { ok: false; error: string }
> {
  const res = await fetch("/api/spaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await readJson<{ space?: Space; error?: string }>(res);
  if (!res.ok || !data.space) {
    return { ok: false, error: data.error ?? "Could not create space" };
  }
  return { ok: true, space: data.space };
}

export async function deleteSpace(
  name: string,
  force: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const suffix = force ? "?force=true" : "";
  const res = await fetch(`/api/spaces/${encodeURIComponent(name)}${suffix}`, {
    method: "DELETE",
  });
  const data = await readJson<{ error?: string }>(res);
  if (!res.ok) return { ok: false, error: data.error ?? "Could not delete space" };
  return { ok: true };
}

async function getNotebookMemories(containerTag: string): Promise<Memory[]> {
  const res = await fetch(
    `/api/memories?containerTag=${encodeURIComponent(containerTag)}`
  );
  const data = await readJson<{ memories?: Memory[] }>(res);
  return (data.memories ?? []).map((row) =>
    asMemory({ ...row, source: "notebook" })
  );
}

async function getFactMemories(containerTag: string): Promise<Memory[]> {
  const res = await fetch(
    `/api/v3/memories?containerTag=${encodeURIComponent(containerTag)}`
  );
  const data = await readJson<{ memories?: Memory[] }>(res);
  return (data.memories ?? []).map((row) =>
    asMemory({ ...row, source: "graph", isLatest: row.isLatest ?? true })
  );
}

export async function getMemories(containerTag: string): Promise<Memory[]> {
  const [facts, notes] = await Promise.all([
    getFactMemories(containerTag),
    getNotebookMemories(containerTag),
  ]);
  const factIds = new Set(facts.map((fact) => fact.id));
  const leftover = notes.filter((note) => !factIds.has(note.id));
  return [...facts, ...leftover].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export async function getAllMemories(spaces: Space[]): Promise<Memory[]> {
  const rows = await Promise.all(spaces.map((space) => getMemories(space.name)));
  const byId = new Map<string, Memory>();
  for (const memory of rows.flat()) byId.set(memory.id, memory);
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export async function ingestThought(
  content: string,
  containerTag: string
): Promise<CaptureResult> {
  const res = await fetch("/api/v3/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, containerTag }),
  });
  const data = await readJson<{
    facts?: CaptureFact[];
    extracted?: number;
    error?: string;
  }>(res);
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not extract facts" };
  }
  return {
    ok: true,
    facts: data.facts ?? [],
    extracted: data.extracted ?? data.facts?.length ?? 0,
  };
}

export async function updateMemory(id: string, content: string) {
  const res = await fetch(`/api/memories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return res.ok;
}

export async function deleteMemory(id: string) {
  const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function searchMemories(q: string, containerTag: string) {
  const res = await fetch("/api/v4/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, containerTag }),
  });
  const data = await readJson<{
    results?: Array<{
      id: string;
      kind: "chunk" | "memory";
      content: string;
      containerTag: string;
      documentId: string | null;
      score: number;
      isLatest?: boolean;
    }>;
    mode?: SearchMode;
  }>(res);

  const results: Memory[] = (data.results ?? [])
    .filter((hit) => hit.kind === "memory")
    .map((hit) =>
      asMemory({
        id: hit.id,
        content: hit.content,
        containerTag: hit.containerTag,
        createdAt: "",
        score: hit.score,
        isLatest: hit.isLatest,
        documentId: hit.documentId,
        source: "graph",
      })
    );

  return { results, mode: data.mode };
}

export async function askMemories(question: string, containerTag: string) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, containerTag }),
  });
  return readJson<{ answer?: string; citations?: Memory[] }>(res);
}
