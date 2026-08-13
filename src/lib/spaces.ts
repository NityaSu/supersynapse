import { getDb } from "@/lib/db";

export type Space = {
  name: string;
  createdAt: string;
  memoryCount: number;
};

type SpaceRow = {
  name: string;
  created_at: string;
  memory_count: number;
};

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

export function listSpaces(): Space[] {
  const db = getDb();
  const rows = db
    .query(
      `SELECT s.name, s.created_at,
              (SELECT COUNT(*) FROM memories m WHERE m.container_tag = s.name) AS memory_count
       FROM spaces s
       ORDER BY s.name ASC`
    )
    .all() as SpaceRow[];

  return rows.map((row) => ({
    name: row.name,
    createdAt: row.created_at,
    memoryCount: Number(row.memory_count) || 0,
  }));
}

export function ensureSpace(name: string): Space | null {
  const normalized = normalizeSpaceName(name);
  if (!normalized) return null;

  const db = getDb();
  db.run(`INSERT OR IGNORE INTO spaces (name, created_at) VALUES (?, ?)`, [
    normalized,
    new Date().toISOString(),
  ]);

  const row = db
    .query(
      `SELECT s.name, s.created_at,
              (SELECT COUNT(*) FROM memories m WHERE m.container_tag = s.name) AS memory_count
       FROM spaces s
       WHERE s.name = ?`
    )
    .get(normalized) as SpaceRow | null;

  if (!row) return null;
  return {
    name: row.name,
    createdAt: row.created_at,
    memoryCount: Number(row.memory_count) || 0,
  };
}

export function createSpace(name: string): { space: Space } | { error: string } {
  const normalized = normalizeSpaceName(name);
  if (!normalized) {
    return { error: "space name is required" };
  }

  const db = getDb();
  const existing = db
    .query(`SELECT name FROM spaces WHERE name = ?`)
    .get(normalized) as { name: string } | null;

  if (existing) {
    return { error: "space already exists" };
  }

  const createdAt = new Date().toISOString();
  db.run(`INSERT INTO spaces (name, created_at) VALUES (?, ?)`, [
    normalized,
    createdAt,
  ]);

  return {
    space: { name: normalized, createdAt, memoryCount: 0 },
  };
}

export function deleteSpace(
  name: string,
  options: { force?: boolean } = {}
): { ok: true } | { error: string; status: number } {
  const normalized = normalizeSpaceName(name);
  if (!normalized) {
    return { error: "space name is required", status: 400 };
  }

  if (normalized === "default") {
    return { error: "cannot delete the default space", status: 400 };
  }

  const db = getDb();
  const existing = db
    .query(`SELECT name FROM spaces WHERE name = ?`)
    .get(normalized) as { name: string } | null;

  if (!existing) {
    return { error: "space not found", status: 404 };
  }

  const countRow = db
    .query(`SELECT COUNT(*) AS count FROM memories WHERE container_tag = ?`)
    .get(normalized) as { count: number };

  const count = Number(countRow.count) || 0;
  if (count > 0 && !options.force) {
    return {
      error: `space has ${count} memor${count === 1 ? "y" : "ies"}; pass force=true to delete them too`,
      status: 409,
    };
  }

  if (options.force && count > 0) {
    db.run(`DELETE FROM memories WHERE container_tag = ?`, [normalized]);
  }

  db.run(`DELETE FROM spaces WHERE name = ?`, [normalized]);
  return { ok: true };
}
