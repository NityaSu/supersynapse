# Supersynapse

This project builds a memory/context **engine** (documents → chunks → graph memories).

Invent our own internals (Supabase Postgres + pgvector, Gemini). Grow the API in phases.

## Domain

- **Document** = raw input (text for now).
- **Memory** = extracted atomic fact (graph). Distinct from the legacy notebook `memories` table.
- Isolation = **`user_id`** (account) then **`containerTag`** (space).
- Ingest statuses: `queued → extracting → chunking → embedding → indexing → done` (or `failed`).
- Instant dreaming after index: extract facts → `graph_memories`; link with `updates` / `extends` (and `derives` later).

## API (current → next)

- `POST /v3/documents` — ingest (+ dream)
- `GET /v3/documents/:id` — status, chunks, graph memories/edges
- `GET /v3/memories?containerTag=` — latest graph memories
- `POST /v4/search` — hybrid search over chunks + graph memories
- `POST /v4/profile` — profile stub (dynamic = latest facts)
- Auth via Supabase (email/password)
- Web UI on Vercel

## Build order

1. Data model + isolation ✅
2. Ingest pipeline + status machine ✅
3. Dreaming / graph relations ✅
4. Search + profile ✅
5. Auth ✅
6. Web UI ✅

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->
