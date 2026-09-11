"use client";

import { SpaceBadge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import type { Memory } from "@/lib/memories";
import { spaceStyle } from "@/lib/space-style";
import { cn } from "@/lib/cn";

export function RelatedMemory({
  memory,
  onOpen,
  className,
}: {
  memory: Memory;
  onOpen: (id: string) => void;
  className?: string;
}) {
  const style = spaceStyle(memory.containerTag);
  return (
    <button
      className={cn(
        "mb-2 w-full cursor-pointer rounded-[10px] border border-line bg-elevated p-3 text-left transition hover:border-brand",
        className
      )}
      onClick={() => onOpen(memory.id)}
    >
      <p className="line-clamp-2 text-xs leading-5 text-ink-secondary">
        {memory.content}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <SpaceBadge
          label={style.label}
          background={style.badgeBg}
          color={style.badgeText}
        />
        {typeof memory.score === "number" ? (
          <span className="text-[10px] font-bold text-brand">
            {Math.round(memory.score * 100)}% match
          </span>
        ) : (
          <span className="text-xs text-ink-subtle" suppressHydrationWarning>
            {timeAgo(memory.createdAt)}
          </span>
        )}
      </div>
    </button>
  );
}
