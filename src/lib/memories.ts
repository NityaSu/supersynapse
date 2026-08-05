import { promises as fs } from "fs";
import path from "path";

export type Memory = {
  id: string;
  content: string;
  createdAt: string;
};

const DATA_FILE = path.join(process.cwd(), "data", "memories.json");

async function readMemories(): Promise<Memory[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Memory[];
  } catch {
    return [];
  }
}

async function writeMemories(memories: Memory[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(memories, null, 2), "utf-8");
}

export async function listMemories(): Promise<Memory[]> {
  const memories = await readMemories();
  return memories.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addMemory(content: string): Promise<Memory> {
  const memories = await readMemories();

  const memory: Memory = {
    id: crypto.randomUUID(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  memories.push(memory);
  await writeMemories(memories);
  return memory;
}

export async function searchMemories(query: string): Promise<Memory[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const memories = await readMemories();
  return memories.filter((m) => m.content.toLowerCase().includes(q));
}
