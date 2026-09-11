import { labelize } from "@/lib/format";

export type SpaceStyle = {
  label: string;
  dot: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
};

const NAMED: Record<string, Omit<SpaceStyle, "label">> = {
  work: {
    dot: "#3B82F6",
    badgeBg: "rgba(59,130,246,0.1)",
    badgeText: "#3B82F6",
    accent: "#3B82F6",
  },
  personal: {
    dot: "#10B981",
    badgeBg: "rgba(16,185,129,0.1)",
    badgeText: "#10B981",
    accent: "#10B981",
  },
  learning: {
    dot: "#8B5CF6",
    badgeBg: "rgba(139,92,246,0.1)",
    badgeText: "#8B5CF6",
    accent: "#8B5CF6",
  },
  default: {
    dot: "#A8A29E",
    badgeBg: "rgba(168,162,158,0.15)",
    badgeText: "#78716C",
    accent: "#A8A29E",
  },
};

const PALETTE = [
  NAMED.work,
  NAMED.personal,
  NAMED.learning,
  {
    dot: "#F59E0B",
    badgeBg: "rgba(245,158,11,0.12)",
    badgeText: "#D97706",
    accent: "#F59E0B",
  },
  {
    dot: "#EF4444",
    badgeBg: "rgba(239,68,68,0.12)",
    badgeText: "#DC2626",
    accent: "#EF4444",
  },
  {
    dot: "#06B6D4",
    badgeBg: "rgba(6,182,212,0.12)",
    badgeText: "#0891B2",
    accent: "#06B6D4",
  },
];

function hashName(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function spaceStyle(name: string): SpaceStyle {
  const named = NAMED[name];
  const colors = named ?? PALETTE[hashName(name) % PALETTE.length];
  return { label: labelize(name), ...colors };
}
