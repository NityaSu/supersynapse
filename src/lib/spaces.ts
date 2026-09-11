import { requireUser } from "@/lib/auth";

export type Space = {
  name: string;
  createdAt: string;
  memoryCount: number;
};

const DEFAULT_SPACES = ["default", "work", "personal"] as const;

/** Normalize space names: trim, lowercase, hyphens for spaces. */
export function normalizeSpaceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedDefaultSpaces() {
  const { supabase, user } = await requireUser();
  const now = new Date().toISOString();
  await supabase.from("spaces").upsert(
    DEFAULT_SPACES.map((name) => ({
      user_id: user.id,
      name,
      created_at: now,
    })),
    { onConflict: "user_id,name", ignoreDuplicates: true }
  );
}

export async function listSpaces(): Promise<Space[]> {
  const { supabase } = await requireUser();
  await seedDefaultSpaces();

  const { data: spaceRows, error } = await supabase
    .from("spaces")
    .select("name, created_at")
    .order("name", { ascending: true });

  if (error) throw error;

  const { data: memoryRows, error: countError } = await supabase
    .from("memories")
    .select("container_tag");
  if (countError) throw countError;

  const counts = new Map<string, number>();
  for (const row of memoryRows ?? []) {
    counts.set(row.container_tag, (counts.get(row.container_tag) ?? 0) + 1);
  }

  return (spaceRows ?? []).map((row) => ({
    name: row.name,
    createdAt: row.created_at,
    memoryCount: counts.get(row.name) ?? 0,
  }));
}

export async function ensureSpace(name: string): Promise<Space | null> {
  const normalized = normalizeSpaceName(name);
  if (!normalized) return null;

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("spaces").upsert(
    {
      user_id: user.id,
      name: normalized,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,name", ignoreDuplicates: true }
  );
  if (error) throw error;

  return { name: normalized, createdAt: new Date().toISOString(), memoryCount: 0 };
}

export async function createSpace(
  name: string
): Promise<{ space: Space } | { error: string }> {
  const normalized = normalizeSpaceName(name);
  if (!normalized) {
    return { error: "space name is required" };
  }

  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("spaces")
    .select("name")
    .eq("name", normalized)
    .maybeSingle();

  if (existing) {
    return { error: "space already exists" };
  }

  const createdAt = new Date().toISOString();
  const { error } = await supabase.from("spaces").insert({
    user_id: user.id,
    name: normalized,
    created_at: createdAt,
  });
  if (error) {
    if (error.code === "23505") return { error: "space already exists" };
    throw error;
  }

  return {
    space: { name: normalized, createdAt, memoryCount: 0 },
  };
}

export async function deleteSpace(
  name: string,
  options: { force?: boolean } = {}
): Promise<{ ok: true } | { error: string; status: number }> {
  const normalized = normalizeSpaceName(name);
  if (!normalized) {
    return { error: "space name is required", status: 400 };
  }

  if (normalized === "default") {
    return { error: "cannot delete the default space", status: 400 };
  }

  const { supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("spaces")
    .select("name")
    .eq("name", normalized)
    .maybeSingle();

  if (!existing) {
    return { error: "space not found", status: 404 };
  }

  const { count, error: countError } = await supabase
    .from("memories")
    .select("id", { count: "exact", head: true })
    .eq("container_tag", normalized);

  if (countError) throw countError;

  const memoryCount = count ?? 0;
  if (memoryCount > 0 && !options.force) {
    return {
      error: `space has ${memoryCount} memor${memoryCount === 1 ? "y" : "ies"}; pass force=true to delete them too`,
      status: 409,
    };
  }

  const { error } = await supabase.from("spaces").delete().eq("name", normalized);
  if (error) throw error;
  return { ok: true };
}
