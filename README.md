# Supersynapse

A memory engine: ingest a thought, extract atomic facts, and keep a history when those facts change. Retrieval prefers what is true *now*, not whatever chunk happened to be similar.

Naive RAG treats “we use Postgres” and “we moved to Mongo” as two equally good hits. This system links the second to the first with `updates`, sets `is_latest = false` on the old row, and answers with Mongo.

The web UI is a client of that engine, not the product.

Stack: Vercel, Supabase (Postgres + pgvector + Auth), Gemini. Isolation is `user_id`, then `containerTag` (space). Row Level Security is `auth.uid() = user_id` on every table.

## How a thought is stored

```
thought → document → chunks → embeddings → dream → graph_memories + edges
```

Dreaming:

1. Extract short facts (Gemini; sentence split if the model is down).
2. Embed each fact and find the closest *latest* fact in the same space.
3. Cosine ≥ 0.82 → `updates` (old fact is no longer latest).
4. Cosine ≥ 0.55 → `extends`.
5. Otherwise → a new root fact.

Those cutoffs are provisional. They are named constants so they can be measured; they are not yet the output of an eval set.

Ingest still runs inside the request and returns `201` when dreaming finishes, or `500` if it fails. A `202` + worker is the next backend step, not what ships today.

## Try the contradiction

With `GEMINI_API_KEY` set:

1. Drop “We use Postgres.”
2. Drop “We moved to Mongo.”
3. The second fact should show **Replaces “We use Postgres.”**
4. Ask “What database do we use?” — current facts only.

Without embeddings, facts still extract, but they will not link.

## Setup

1. Create a [Supabase](https://supabase.com) project.
2. SQL Editor: run `supabase/schema.sql`.
3. Auth → Email: Confirm email can be off while testing.
4. Auth → URL: Site URL `http://localhost:3000`; Redirect `http://localhost:3000/auth/callback` (add the Vercel URL later).
5. Project Settings → API: **Project URL** and **anon** key. Not the REST URL, not the service role key.
6. [Gemini API key](https://aistudio.google.com/apikey) (free tier, server-only).
7. Copy `.env.local.example` → `.env.local`.

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, drop a thought. Free-tier Supabase pauses after about a week idle; restore the project in the dashboard if sign-in returns `Failed to fetch`.

## Deploy

Import the repo on Vercel (`bun run build`). Set the same env vars. Put the Vercel origin on Supabase Site URL and Redirect URLs.

`GEMINI_API_KEY` is a Secret. The two `NEXT_PUBLIC_SUPABASE_*` values are public by design (Config). When Gemini quota is spent, keyword search still works; dreaming will not link facts.

## Tests

```bash
bun test src        # no network
bun run test:rls    # two real users against Supabase
```

Unit tests cover chunking, vector parsing, ILIKE escaping, hybrid merge/score floor, dream JSON parsing, and `updates` / `extends` classification.

`test:rls` signs in with the **anon** key — the same key the browser uses. The service role key would bypass RLS and make the suite worthless. Set `RLS_TEST_USER_{A,B}_{EMAIL,PASSWORD}` in `.env.local`; without them the suite skips.

## API

Session cookie required. Unauthenticated calls are `401`.

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/v3/documents` | Ingest + dream. Body: `{ content, containerTag? }`. Returns extracted facts and any `updates` / `extends`. |
| `GET` | `/api/v3/documents/:id` | Status, chunks, facts, edges. |
| `GET` | `/api/v3/memories?containerTag=` | Latest facts in a space, with what they replaced. |
| `POST` | `/api/v4/search` | Hybrid search over chunks + latest graph memories. |
| `POST` | `/api/v4/profile` | Latest facts as a profile stub. |
| `POST` | `/api/ask` | Answer from current facts only. |
| `GET/POST/DELETE` | `/api/spaces` | Spaces. |

`POST /api/memories` is the same ingest as `/api/v3/documents`. `GET /api/memories` still reads the leftover notebook table so older rows do not disappear from the UI.

## Not in this repo yet

- Async ingest (`202`, idempotency key, a worker).
- An eval that measures false supersessions, so 0.82 / 0.55 stop being guesses.
- Entity-level edges (`lives_in`, `worked_as`). Today the graph is fact-to-fact: `updates`, `extends`.
