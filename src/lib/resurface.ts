import { labelize } from "@/lib/format";
import type { Memory } from "@/lib/memories";

const DAY = 24 * 60 * 60 * 1000;

export type ResurfaceWhyIcon = "bolt" | "clock" | "empty";

export type ResurfaceItem = {
  memory: Memory;
  why: string;
  whyIcon: ResurfaceWhyIcon;
  related: Memory[];
  notice: string | null;
};

export function snippet(content: string, max = 42) {
  const text = content.trim().replace(/\s+/g, " ");
  return text.length <= max ? text : `${text.slice(0, max).trim()}…`;
}

/**
 * Pick a couple of older memories to bring back — not the latest capture.
 */
export function pickResurfaced(
  memories: Memory[],
  space: string,
  now = Date.now()
): ResurfaceItem[] {
  const scoped =
    space === "all"
      ? memories
      : memories.filter((m) => m.containerTag === space);
  if (scoped.length === 0) return [];

  const sorted = [...scoped].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
  const skipNewest = sorted.length >= 3 ? 1 : 0;
  const pool = sorted.slice(skipNewest);
  const aged = pool.filter((m) => {
    const age = now - Date.parse(m.createdAt);
    return age >= DAY && age <= 21 * DAY;
  });
  const chosen = (aged.length > 0 ? aged : pool).slice(0, 2);

  return chosen.map((memory, index) => {
    const related = scoped
      .filter(
        (m) => m.id !== memory.id && m.containerTag === memory.containerTag
      )
      .slice(0, 2);
    const weekCount = scoped.filter(
      (m) =>
        m.containerTag === memory.containerTag &&
        now - Date.parse(m.createdAt) < 7 * DAY
    ).length;
    const ageDays = Math.max(
      1,
      Math.floor((now - Date.parse(memory.createdAt)) / DAY)
    );
    const spaceLabel = labelize(memory.containerTag).toLowerCase();
    const noticed =
      weekCount >= 2
        ? `Supersynapse noticed you saved ${weekCount} ${spaceLabel} memories this week`
        : null;

    if (index === 0 && related.length > 0) {
      return {
        memory,
        why: "Relevant to what you are building",
        whyIcon: "bolt",
        related,
        notice: null,
      };
    }

    if (ageDays >= 2) {
      return {
        memory,
        why: `You saved something similar ${ageDays} day${ageDays === 1 ? "" : "s"} ago`,
        whyIcon: "clock",
        related: [],
        notice: noticed,
      };
    }

    return {
      memory,
      why: "Bringing this back while it's still useful",
      whyIcon: "empty",
      related,
      notice: noticed,
    };
  });
}
