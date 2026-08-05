"use client";

import { useEffect, useState } from "react";

type Memory = {
  id: string;
  content: string;
  createdAt: string;
};

export default function Home() {
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [results, setResults] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadMemories() {
    const res = await fetch("/api/memories");
    const data = await res.json();
    setMemories(data.memories ?? []);
  }

  useEffect(() => {
    loadMemories();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setContent("");
    await loadMemories();
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-3xl font-bold">Supersynapse</h1>
        <p className="text-zinc-600">Learning project — add and search memories</p>
      </header>

      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <label className="font-medium">Add memory</label>
        <textarea
          className="rounded border p-3"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="I love building AI tools..."
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Save memory
        </button>
      </form>

      <form onSubmit={handleSearch} className="flex flex-col gap-3">
        <label className="font-medium">Search</label>
        <input
          className="rounded border p-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search keywords..."
        />
        <button type="submit" className="rounded border px-4 py-2">
          Search
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-semibold">All memories</h2>
        <ul className="space-y-2">
          {memories.map((m) => (
            <li key={m.id} className="rounded border p-3">
              {m.content}
            </li>
          ))}
        </ul>
      </section>

      {results.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Search results</h2>
          <ul className="space-y-2">
            {results.map((m) => (
              <li key={m.id} className="rounded border bg-zinc-50 p-3">
                {m.content}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
