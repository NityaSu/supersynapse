-- Paste this into the Supabase SQL editor (Dashboard → SQL → New query).
-- Run once per project. Free tier: Postgres + Auth + pgvector.

create extension if not exists vector with schema extensions;

create table if not exists public.spaces (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, name)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  container_tag text not null default 'default',
  created_at timestamptz not null default now(),
  embedding extensions.vector(768),
  foreign key (user_id, container_tag)
    references public.spaces (user_id, name) on delete cascade
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  container_tag text not null,
  title text,
  content text not null,
  type text not null default 'text',
  status text not null default 'queued',
  error text,
  chunk_count integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, container_tag)
    references public.spaces (user_id, name) on delete cascade
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  container_tag text not null,
  content text not null,
  position integer not null,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  foreign key (user_id, container_tag)
    references public.spaces (user_id, name) on delete cascade
);

create table if not exists public.graph_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  container_tag text not null,
  document_id uuid references public.documents (id) on delete set null,
  content text not null,
  is_latest boolean not null default true,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, container_tag)
    references public.spaces (user_id, name) on delete cascade
);

create table if not exists public.memory_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  container_tag text not null,
  from_memory_id uuid not null references public.graph_memories (id) on delete cascade,
  to_memory_id uuid not null references public.graph_memories (id) on delete cascade,
  relation text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, container_tag)
    references public.spaces (user_id, name) on delete cascade
);

create index if not exists idx_memories_user_tag on public.memories (user_id, container_tag);
create index if not exists idx_documents_user_tag on public.documents (user_id, container_tag);
create index if not exists idx_chunks_document on public.chunks (document_id);
create index if not exists idx_graph_memories_user_tag on public.graph_memories (user_id, container_tag);
create index if not exists idx_memory_edges_user on public.memory_edges (user_id, container_tag);

create index if not exists idx_memories_embedding
  on public.memories using hnsw (embedding vector_cosine_ops);
create index if not exists idx_chunks_embedding
  on public.chunks using hnsw (embedding vector_cosine_ops);
create index if not exists idx_graph_memories_embedding
  on public.graph_memories using hnsw (embedding vector_cosine_ops);

alter table public.spaces enable row level security;
alter table public.memories enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.graph_memories enable row level security;
alter table public.memory_edges enable row level security;

drop policy if exists "own spaces" on public.spaces;
drop policy if exists "own memories" on public.memories;
drop policy if exists "own documents" on public.documents;
drop policy if exists "own chunks" on public.chunks;
drop policy if exists "own graph memories" on public.graph_memories;
drop policy if exists "own memory edges" on public.memory_edges;

create policy "own spaces" on public.spaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own memories" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own chunks" on public.chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own graph memories" on public.graph_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own memory edges" on public.memory_edges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant all on table public.spaces to authenticated;
grant all on table public.memories to authenticated;
grant all on table public.documents to authenticated;
grant all on table public.chunks to authenticated;
grant all on table public.graph_memories to authenticated;
grant all on table public.memory_edges to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.spaces (user_id, name)
  values
    (new.id, 'default'),
    (new.id, 'work'),
    (new.id, 'personal')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.match_memories(
  query_embedding extensions.vector(768),
  match_container_tag text,
  match_count int default 20
)
returns table (
  id uuid,
  content text,
  container_tag text,
  created_at timestamptz,
  score float
)
language sql
stable
security invoker
as $$
  select
    m.id,
    m.content,
    m.container_tag,
    m.created_at,
    (1 - (m.embedding <=> query_embedding))::float as score
  from public.memories m
  where m.user_id = auth.uid()
    and m.container_tag = match_container_tag
    and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_count
$$;

create or replace function public.match_chunks(
  query_embedding extensions.vector(768),
  match_container_tag text,
  match_count int default 20
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  container_tag text,
  score float
)
language sql
stable
security invoker
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.container_tag,
    (1 - (c.embedding <=> query_embedding))::float as score
  from public.chunks c
  where c.user_id = auth.uid()
    and c.container_tag = match_container_tag
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
$$;

create or replace function public.match_graph_memories(
  query_embedding extensions.vector(768),
  match_container_tag text,
  match_count int default 20
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  container_tag text,
  is_latest boolean,
  created_at timestamptz,
  updated_at timestamptz,
  score float
)
language sql
stable
security invoker
as $$
  select
    g.id,
    g.document_id,
    g.content,
    g.container_tag,
    g.is_latest,
    g.created_at,
    g.updated_at,
    (1 - (g.embedding <=> query_embedding))::float as score
  from public.graph_memories g
  where g.user_id = auth.uid()
    and g.container_tag = match_container_tag
    and g.is_latest = true
    and g.embedding is not null
  order by g.embedding <=> query_embedding
  limit match_count
$$;

grant execute on function public.match_memories to authenticated;
grant execute on function public.match_chunks to authenticated;
grant execute on function public.match_graph_memories to authenticated;
