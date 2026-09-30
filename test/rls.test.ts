/**
 * Tenancy isolation, verified against a real Supabase project.
 *
 * Row Level Security is the only thing standing between two users' data, so it
 * gets tested against the real database rather than a mock. These tests use the
 * anon key exactly like the browser does — never the service role key, which
 * bypasses RLS and would make the whole suite meaningless.
 *
 * Setup (once): create two users in Supabase Auth, then add to .env.local:
 *   RLS_TEST_USER_A_EMAIL=...
 *   RLS_TEST_USER_A_PASSWORD=...
 *   RLS_TEST_USER_B_EMAIL=...
 *   RLS_TEST_USER_B_PASSWORD=...
 *
 * Without those the suite skips instead of failing, so `bun test` stays green
 * for anyone who has only checked out the code.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const userA = {
  email: process.env.RLS_TEST_USER_A_EMAIL,
  password: process.env.RLS_TEST_USER_A_PASSWORD,
};
const userB = {
  email: process.env.RLS_TEST_USER_B_EMAIL,
  password: process.env.RLS_TEST_USER_B_PASSWORD,
};

const configured = Boolean(
  url && anonKey && userA.email && userA.password && userB.email && userB.password
);

if (!configured) {
  console.log(
    "[rls] skipped — set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "and RLS_TEST_USER_A/B_EMAIL/PASSWORD in .env.local to run these."
  );
}

function anonClient(): SupabaseClient {
  return createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string, password: string) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw new Error(`could not sign in ${email}: ${error?.message ?? "no user"}`);
  }
  return { client, userId: data.user.id };
}

const suite = configured ? describe : describe.skip;

suite("row level security", () => {
  let a: { client: SupabaseClient; userId: string };
  let b: { client: SupabaseClient; userId: string };
  let secretId: string;
  const secretContent = `rls-probe-${crypto.randomUUID()}`;

  beforeAll(async () => {
    a = await signIn(userA.email!, userA.password!);
    b = await signIn(userB.email!, userB.password!);

    if (a.userId === b.userId) {
      throw new Error("test users A and B are the same account");
    }

    const { data, error } = await a.client
      .from("memories")
      .insert({
        id: crypto.randomUUID(),
        user_id: a.userId,
        content: secretContent,
        container_tag: "default",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(`user A could not seed a row: ${error.message}`);
    secretId = data.id;
  });

  afterAll(async () => {
    if (secretId) await a.client.from("memories").delete().eq("id", secretId);
  });

  test("the owner can read their own row", async () => {
    const { data, error } = await a.client
      .from("memories")
      .select("id, content")
      .eq("id", secretId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.content).toBe(secretContent);
  });

  test("another user cannot read that row by id", async () => {
    const { data, error } = await b.client
      .from("memories")
      .select("id, content")
      .eq("id", secretId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  test("another user's unfiltered listing does not contain the row", async () => {
    const { data, error } = await b.client.from("memories").select("id");

    expect(error).toBeNull();
    expect((data ?? []).map((row) => row.id)).not.toContain(secretId);
  });

  test("another user cannot find the row by content search", async () => {
    const { data, error } = await b.client
      .from("memories")
      .select("id")
      .ilike("content", `%${secretContent}%`);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  test("another user's update silently affects nothing", async () => {
    const { data, error } = await b.client
      .from("memories")
      .update({ content: "tampered" })
      .eq("id", secretId)
      .select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  test("another user's delete silently affects nothing", async () => {
    const { data, error } = await b.client
      .from("memories")
      .delete()
      .eq("id", secretId)
      .select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  test("the row is still intact and unmodified after those attempts", async () => {
    const { data } = await a.client
      .from("memories")
      .select("content")
      .eq("id", secretId)
      .maybeSingle();

    expect(data?.content).toBe(secretContent);
  });

  test("a user cannot write a row owned by someone else", async () => {
    const { error } = await b.client.from("memories").insert({
      id: crypto.randomUUID(),
      user_id: a.userId,
      content: "forged on behalf of user A",
      container_tag: "default",
      created_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
  });

  test("spaces are isolated too", async () => {
    const { data, error } = await b.client.from("spaces").select("user_id");

    expect(error).toBeNull();
    expect((data ?? []).every((row) => row.user_id === b.userId)).toBe(true);
  });

  test("semantic search cannot cross the tenancy boundary", async () => {
    const { data, error } = await b.client.rpc("match_memories", {
      query_embedding: Array.from({ length: 768 }, () => 0.01),
      match_container_tag: "default",
      match_count: 50,
    });

    expect(error).toBeNull();
    const ids = ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
    expect(ids).not.toContain(secretId);
  });

  test("a signed-out client reads nothing at all", async () => {
    const { data, error } = await anonClient().from("memories").select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
