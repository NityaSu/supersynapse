"use client";

import { SpaceBadge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import type { Memory } from "@/lib/memories";
import { spaceStyle } from "@/lib/space-style";

export function MemoryCard({
  memory,
  favorited,
  matchScore,
  onOpen,
}: {
  memory: Memory;
  favorited: boolean;
  matchScore: number | null;
  onOpen: (id: string) => void;
}) {
  const style = spaceStyle(memory.containerTag);
  return (
    <button
      className="animate-fade relative w-full cursor-pointer overflow-hidden rounded-[14px] border border-line bg-elevated p-4 text-left transition hover:-translate-y-px hover:border-line-hover hover:shadow-card before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[3px] before:bg-[var(--card-accent)] before:opacity-0 before:transition-opacity hover:before:opacity-100"
      style={{ ["--card-accent" as string]: style.accent }}
      onClick={() => onOpen(memory.id)}
    >
      <p className="mb-3 line-clamp-3 text-sm leading-6 text-ink-secondary">
        {memory.content}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SpaceBadge
          label={style.label}
          background={style.badgeBg}
          color={style.badgeText}
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-subtle" suppressHydrationWarning>
            {timeAgo(memory.createdAt)}
          </span>
          {favorited ? (
            <svg
              className="size-4 text-brand"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : null}
        </div>
      </div>
      {matchScore !== null ? (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-brand before:size-1.5 before:animate-pulse before:rounded-full before:bg-brand before:content-['']">
          {matchScore}% semantic match
        </div>
      ) : null}
    </button>
  );
}
