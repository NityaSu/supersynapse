"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/cn";
import { spaceStyle } from "@/lib/space-style";

export function CommandPalette() {
  const {
    cmdOpen,
    setCmdOpen,
    setAddOpen,
    setRightPanelOpen,
    toggleTheme,
    setSpace,
    openDetail,
    spaces,
    memories,
  } = useWorkspace();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.toLowerCase();
  const items = useMemo(() => {
    const list = [
      { id: "new", label: "New Memory", hint: "Command", run: () => setAddOpen(true) },
      { id: "theme", label: "Toggle Theme", hint: "Command", run: toggleTheme },
      {
        id: "ask",
        label: "Ask your memories",
        hint: "Command",
        run: () => setRightPanelOpen(true),
      },
      ...spaces.map((space) => ({
        id: `space-${space.name}`,
        label: `Switch to ${spaceStyle(space.name).label}`,
        hint: "Space",
        run: () => setSpace(space.name),
      })),
      ...memories.slice(0, 8).map((m) => ({
        id: `mem-${m.id}`,
        label: m.content.length > 55 ? `${m.content.slice(0, 55)}…` : m.content,
        hint: spaceStyle(m.containerTag).label,
        run: () => openDetail(m.id),
      })),
    ];
    return list.filter((item) => !q || item.label.toLowerCase().includes(q));
  }, [
    q,
    setAddOpen,
    toggleTheme,
    setRightPanelOpen,
    spaces,
    memories,
    setSpace,
    openDetail,
  ]);

  useEffect(() => {
    if (!cmdOpen) return;
    const t = window.setTimeout(() => {
      setQuery("");
      setIndex(0);
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [cmdOpen]);

  useEffect(() => {
    if (!cmdOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[index];
        if (item) {
          setCmdOpen(false);
          item.run();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cmdOpen, items, index, setCmdOpen]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[300] flex justify-center bg-black/35 pt-[15vh] opacity-0 backdrop-blur-[6px] transition-opacity",
        cmdOpen ? "pointer-events-auto opacity-100" : "pointer-events-none"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) setCmdOpen(false);
      }}
    >
      <div
        className={cn(
          "mx-4 w-full max-w-[600px] scale-[0.98] overflow-hidden rounded-[18px] border border-line bg-elevated shadow-pop transition-transform",
          cmdOpen && "scale-100"
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-[18px] py-3.5 text-ink-subtle">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            className="flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Search memories, spaces, or commands..."
          />
          <Kbd className="text-[11px]">ESC</Kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="px-6 py-6 text-center text-sm text-ink-muted">
              No results found
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-md border-0 px-3 py-2.5 text-left text-sm text-ink-secondary transition hover:bg-canvas hover:text-ink",
                  idx === index && "bg-canvas text-ink"
                )}
                onMouseEnter={() => setIndex(idx)}
                onClick={() => {
                  setCmdOpen(false);
                  item.run();
                }}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-muted">
                  <Icon name="doc" size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.label}</div>
                  <div className="text-[10px] text-ink-subtle">{item.hint}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
