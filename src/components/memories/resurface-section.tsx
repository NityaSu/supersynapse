"use client";

import { useMemo } from "react";
import { ResurfaceCard } from "@/components/memories/resurface-card";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { pickResurfaced } from "@/lib/resurface";

export function ResurfaceSection() {
  const { memories, visibleSpace, searchQuery, loading, openDetail } =
    useWorkspace();

  const items = useMemo(
    () => pickResurfaced(memories, visibleSpace),
    [memories, visibleSpace]
  );

  if (loading || searchQuery.trim() || items.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="live-dot" />
        <h2 className="font-display text-[13px] font-bold tracking-[0.1em] text-brand uppercase">
          Resurfacing now
        </h2>
        <span className="ml-auto font-mono text-xs text-ink-subtle">
          {items.length} {items.length === 1 ? "memory" : "memories"}
        </span>
      </div>
      {items.map((item) => (
        <ResurfaceCard key={item.memory.id} item={item} onOpen={openDetail} />
      ))}
    </section>
  );
}
