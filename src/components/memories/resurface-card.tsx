"use client";

import { SpaceBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { timeAgo } from "@/lib/format";
import type { Memory } from "@/lib/memories";
import { snippet, type ResurfaceItem } from "@/lib/resurface";
import { spaceStyle } from "@/lib/space-style";

export function ResurfaceCard({
  item,
  onOpen,
}: {
  item: ResurfaceItem;
  onOpen: (id: string) => void;
}) {
  const { memory, why, whyIcon, related, notice } = item;
  const style = spaceStyle(memory.containerTag);

  return (
    <button
      type="button"
      className="relative mb-2.5 w-full cursor-pointer overflow-hidden rounded-[18px] border border-line bg-elevated p-[22px] text-left transition hover:-translate-y-0.5 hover:border-line-hover hover:shadow-card before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-[linear-gradient(90deg,#ff6600,#ff944d,#ff6600)] before:opacity-60"
      onClick={() => onOpen(memory.id)}
    >
      <div className="mb-2.5 flex items-center gap-2 text-brand">
        <Icon name={whyIcon} size={14} />
        <span className="text-[11.5px] font-bold tracking-[0.08em] uppercase">
          {why}
        </span>
      </div>
      <p className="text-[15px] leading-[1.7] text-ink-secondary">
        {memory.content}
      </p>
      <div className="mt-3.5 flex items-center gap-3">
        <SpaceBadge
          label={style.label}
          background={style.badgeBg}
          color={style.badgeText}
        />
        <span className="text-xs text-ink-muted" suppressHydrationWarning>
          Saved {timeAgo(memory.createdAt)}
        </span>
      </div>
      {(related.length > 0 || notice) && (
        <div className="mt-3.5 flex items-start gap-2 border-t border-line pt-3 text-left">
          <Icon name={notice && related.length === 0 ? "empty" : "link"} size={14} className="mt-0.5 shrink-0 text-ink-subtle" />
          {related.length > 0 ? (
            <p className="text-xs text-ink-muted">
              Connected to{" "}
              {related.map((other, i) => (
                <span key={other.id}>
                  {i > 0 ? " and " : null}
                  <RelatedLink memory={other} onOpen={onOpen} />
                </span>
              ))}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">{notice}</p>
          )}
        </div>
      )}
    </button>
  );
}

function RelatedLink({
  memory,
  onOpen,
}: {
  memory: Memory;
  onOpen: (id: string) => void;
}) {
  return (
    <span
      role="link"
      tabIndex={0}
      className="font-semibold text-brand hover:underline"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(memory.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpen(memory.id);
        }
      }}
    >
      {snippet(memory.content)}
    </span>
  );
}
