# Supersynapse

A personal memory layer: save notes by space, search them (keyword + semantic), and ask questions over what you stored.

Hosted on **Vercel + Supabase + Gemini**. No local database or Ollama.

## Setup (free)

1. Create a [Supabase](https://supabase.com) project.
2. In **SQL Editor**, paste and run `supabase/schema.sql`.
3. Auth → Providers → Email: you can turn **Confirm email** off while testing.
4. Auth → URL configuration:
   - Site URL: `http://localhost:3000` (and later your `https://….vercel.app`)
   - Redirect URLs: `http://localhost:3000/auth/callback` and the Vercel equivalent
5. Project Settings → API: copy **Project URL** and **anon public** key.
6. Create a [Gemini API key](https://aistudio.google.com/apikey) (free tier).
7. Copy `.env.local.example` to `.env.local` and fill the values.

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, save a memory.

## Deploy on Vercel

1. Push this repo and import it on Vercel (`bun run build`).
2. Set the same env vars as `.env.local.example`.
3. Add the Vercel URL to Supabase Site URL / Redirect URLs.

Anyone who signs up gets their own private spaces. Search and Ask use Gemini until the free daily quota is hit; keyword search still works without it.

## API

All routes require a signed-in session cookie.

- `GET/POST /api/spaces` `DELETE /api/spaces/:name`
- `GET/POST /api/memories` `PATCH/DELETE /api/memories/:id`
- `GET /api/search?q=&containerTag=`
- `POST /api/ask`
- `POST /api/v3/documents` — ingest + dream
- `GET /api/v3/documents/:id`
- `GET /api/v3/memories?containerTag=`
- `POST /api/v4/search`
- `POST /api/v4/profile`
