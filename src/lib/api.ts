import type { Memory } from "@/lib/memories";
import type { Space } from "@/lib/spaces";
import type { SearchMode } from "@/lib/types";

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
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

export async function getMemories(containerTag: string): Promise<Memory[]> {
  const res = await fetch(
    `/api/memories?containerTag=${encodeURIComponent(containerTag)}`
  );
  const data = await readJson<{ memories?: Memory[] }>(res);
  return data.memories ?? [];
}

export async function getAllMemories(spaces: Space[]): Promise<Memory[]> {
  const rows = await Promise.all(spaces.map((space) => getMemories(space.name)));
  return rows
    .flat()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function createMemory(content: string, containerTag: string) {
  await fetch("/api/memories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, containerTag }),
  });
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
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q)}&containerTag=${encodeURIComponent(containerTag)}`
  );
  return readJson<{ results?: Memory[]; mode?: SearchMode }>(res);
}

export async function askMemories(question: string, containerTag: string) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, containerTag }),
  });
  return readJson<{ answer?: string; citations?: Memory[] }>(res);
}
