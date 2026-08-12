"use client";

import { useEffect, useState } from "react";

type Memory = {
  id: string;
  content: string;
  containerTag: string;
  createdAt: string;
  score?: number;
};

const SPACES = ["default", "work", "personal"] as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function Home() {
  const [containerTag, setContainerTag] = useState<string>("default");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [results, setResults] = useState<Memory[]>([]);
  const [searchMode, setSearchMode] = useState<"semantic" | "keyword" | null>(
    null
  );
  const [searched, setSearched] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Memory[]>([]);
  const [askMode, setAskMode] = useState<"semantic" | "keyword" | null>(null);
  const [asked, setAsked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadMemories(space: string) {
    const res = await fetch(
      `/api/memories?containerTag=${encodeURIComponent(space)}`
    );
    const data = await res.json();
    setMemories(data.memories ?? []);
  }

  useEffect(() => {
    loadMemories(containerTag);
    setResults([]);
    setSearched(false);
    setSearchMode(null);
    setAnswer(null);
    setCitations([]);
    setAsked(false);
    setAskMode(null);
    setEditingId(null);
    setEditContent("");
  }, [containerTag]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, containerTag }),
    });

    setContent("");
    await loadMemories(containerTag);
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearched(true);

    const res = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&containerTag=${encodeURIComponent(containerTag)}`
    );
    const data = await res.json();
    setResults(data.results ?? []);
    setSearchMode(data.mode ?? "keyword");
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setAsked(true);

    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, containerTag }),
    });
    const data = await res.json();
    setAnswer(data.answer ?? "No answer.");
    setCitations(data.citations ?? []);
    setAskMode(data.mode ?? null);
    setAsking(false);
  }

  function startEdit(m: Memory) {
    setEditingId(m.id);
    setEditContent(m.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function handleSaveEdit(id: string) {
    if (!editContent.trim()) return;

    setSavingId(id);
    const res = await fetch(`/api/memories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });

    if (res.ok) {
      setEditingId(null);
      setEditContent("");
      await loadMemories(containerTag);
      // Clear stale search/ask views that may cite old text
      setResults([]);
      setSearched(false);
      setSearchMode(null);
      setAnswer(null);
      setCitations([]);
      setAsked(false);
      setAskMode(null);
    }
    setSavingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this memory?")) return;

    setSavingId(id);
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) cancelEdit();
      await loadMemories(containerTag);
      setResults((prev) => prev.filter((m) => m.id !== id));
      setCitations((prev) => prev.filter((m) => m.id !== id));
    }
    setSavingId(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-10 px-4 py-10 sm:px-8">
      <header className="border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Supersynapse
        </h1>
        <p className="mt-1 text-zinc-600">
          Save memories by space, search by meaning, or ask questions over them.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Space
        </h2>
        <select
          id="space"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          value={containerTag}
          onChange={(e) => setContainerTag(e.target.value)}
        >
          {SPACES.map((space) => (
            <option key={space} value={space}>
              {space}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Add
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <textarea
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="I love Paris..."
          />
          <button
            type="submit"
            disabled={loading}
            className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? "Saving…" : `Save to ${containerTag}`}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Search
        </h2>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="favorite travel city"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-900"
          >
            Search
          </button>
        </form>
        {searchMode && (
          <p className="mt-2 text-sm text-zinc-500">
            Mode: {searchMode === "semantic" ? "semantic (embeddings)" : "keyword"}
          </p>
        )}
      </section>

      {searched && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Results
          </h2>
          {results.length === 0 ? (
            <p className="text-zinc-500">No matches in {containerTag}.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 border-t border-zinc-200">
              {results.map((m) => (
                <li key={m.id} className="py-4">
                  <p className="text-zinc-900">{m.content}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {m.containerTag}
                    {" · "}
                    {formatDate(m.createdAt)}
                    {typeof m.score === "number"
                      ? ` · score ${(m.score * 100).toFixed(0)}%`
                      : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Ask
        </h2>
        <form onSubmit={handleAsk} className="flex flex-col gap-3">
          <input
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Where do I like to travel?"
          />
          <button
            type="submit"
            disabled={asking}
            className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {asking ? "Thinking…" : `Ask ${containerTag}`}
          </button>
        </form>
        {askMode && (
          <p className="mt-2 text-sm text-zinc-500">
            Retrieval:{" "}
            {askMode === "semantic" ? "semantic (embeddings)" : "keyword"}
          </p>
        )}
      </section>

      {asked && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Answer
          </h2>
          <p className="whitespace-pre-wrap text-zinc-900">
            {answer ?? "No answer."}
          </p>
          {citations.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Citations
              </h3>
              <ul className="divide-y divide-zinc-200 border-t border-zinc-200">
                {citations.map((m, i) => (
                  <li key={m.id} className="py-4">
                    <p className="text-zinc-900">
                      <span className="mr-2 text-zinc-500">[{i + 1}]</span>
                      {m.content}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {m.containerTag}
                      {" · "}
                      {formatDate(m.createdAt)}
                      {typeof m.score === "number"
                        ? ` · score ${(m.score * 100).toFixed(0)}%`
                        : null}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          List · {containerTag}
        </h2>
        {memories.length === 0 ? (
          <p className="text-zinc-500">
            No memories in this space yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 border-t border-zinc-200">
            {memories.map((m) => (
              <li key={m.id} className="py-4">
                {editingId === m.id ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      disabled={savingId === m.id}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(m.id)}
                        disabled={savingId === m.id || !editContent.trim()}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        {savingId === m.id ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={savingId === m.id}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-zinc-900">{m.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-zinc-500">
                        {m.containerTag} · {formatDate(m.createdAt)}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        disabled={savingId === m.id}
                        className="text-sm text-zinc-600 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        disabled={savingId === m.id}
                        className="text-sm text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {savingId === m.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
