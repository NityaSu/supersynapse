"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResurfaceCard } from "@/components/memories/resurface-card";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { pickResurfaced } from "@/lib/resurface";

const THRESHOLD = 80;
const TAP = 12;

export function ResurfaceSection() {
  const { memories, visibleSpace, searchQuery, loading, openDetail } =
    useWorkspace();
  const items = useMemo(
    () => pickResurfaced(memories, visibleSpace),
    [memories, visibleSpace]
  );
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });

  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
    setDx(0);
    setDragging(false);
  }, [items]);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
  }, []);

  const remaining = items.slice(index);
  const top = remaining[0];
  const next = remaining[1];

  function dismiss(direction: 1 | -1) {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    setDx(direction > 0 ? 480 : -480);
    setDragging(false);
    dismissTimer.current = window.setTimeout(() => {
      setIndex((i) => i + 1);
      setDx(0);
    }, 200);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-related]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDx(e.clientX - start.current.x);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !top) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    setDragging(false);

    if (Math.abs(mx) < TAP && Math.abs(my) < TAP) {
      setDx(0);
      openDetail(top.memory.id);
      return;
    }

    if (Math.abs(mx) >= THRESHOLD) {
      dismiss(mx > 0 ? 1 : -1);
      return;
    }

    setDx(0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!top) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        dismiss(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        dismiss(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top]);

  if (loading || searchQuery.trim() || !top) return null;

  const rotate = dx / 28;
  const leaving = Math.abs(dx) > 200 && !dragging;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="live-dot" />
        <h2 className="font-display text-[13px] font-bold tracking-[0.1em] text-brand uppercase">
          Resurfacing now
        </h2>
        <span className="ml-auto font-mono text-xs text-ink-subtle">
          {index + 1} / {items.length}
        </span>
      </div>
      <div className="relative h-[232px] touch-pan-y select-none">
        {next ? (
          <div className="pointer-events-none absolute inset-0 origin-bottom scale-[0.97] translate-y-2.5">
            <ResurfaceCard item={next} onOpen={openDetail} />
          </div>
        ) : null}
        <div
          className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          style={{
            transform: `translateX(${dx}px) rotate(${rotate}deg)`,
            opacity: leaving ? 0 : 1,
            transition: dragging
              ? "none"
              : "transform 0.2s ease, opacity 0.2s ease",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            setDragging(false);
            setDx(0);
          }}
        >
          <ResurfaceCard item={top} onOpen={openDetail} />
        </div>
      </div>
      <p className="mt-2.5 text-center text-[11px] text-ink-subtle">
        Swipe to review · tap to open
      </p>
    </section>
  );
}
