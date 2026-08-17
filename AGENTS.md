# Supersynapse

This project builds a memory/context **engine** (documents → chunks → graph memories).

Invent our own internals (SQLite, Ollama). Grow the API in phases.

## Domain

- **Document** = raw input (text for now).
- **Memory** = extracted atomic fact (graph). Distinct from the legacy notebook `memories` table.
- Isolation = **`containerTag`**.
- Ingest statuses: `queued → extracting → chunking → embedding → indexing → done` (or `failed`).
- Instant dreaming after index: extract facts → `graph_memories`; link with `updates` / `extends` (and `derives` later).

## API (current → next)

- `POST /v3/documents` — ingest (+ dream)
- `GET /v3/documents/:id` — status, chunks, graph memories/edges
- `GET /v3/memories?containerTag=` — latest graph memories
- Later: search, profile, auth
- Web UI last

## Build order

1. Data model + isolation ✅
2. Ingest pipeline + status machine ✅
3. Dreaming / graph relations ✅
4. Search + profile
5. Auth
6. Web/MCP last

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->
