"use client";

import { useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { Overlay } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/cn";
import { spaceStyle } from "@/lib/space-style";

export function Sidebar() {
  const {
    spaces,
    visibleSpace,
    counts,
    sidebarOpen,
    setSidebarOpen,
    setAddOpen,
    setRightPanelOpen,
    setSpace,
    addSpace,
    removeSpace,
    showToast,
  } = useWorkspace();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const result = await addSpace(name);
    if (result) setError(result);
    else setName("");
    setBusy(false);
  }

  return (
    <>
      <Overlay
        open={sidebarOpen}
        onClick={() => setSidebarOpen(false)}
        className="z-40 lg:hidden"
      />
      <aside
        className={cn(
          "fixed top-14 bottom-0 left-0 z-50 flex w-[260px] -translate-x-full flex-col border-r border-line bg-surface transition-transform duration-300 lg:translate-x-0",
          sidebarOpen && "translate-x-0"
        )}
      >
        <div className="border-b border-line p-4">
          <Button onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={16} />
            New Memory
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.08em] text-ink-subtle uppercase">
            Spaces
          </p>
          <Button
            variant="nav"
            className={visibleSpace === "all" ? "bg-canvas font-semibold text-ink" : ""}
            onClick={() => setSpace("all")}
          >
            <Icon name="grid" />
            All Memories
            <span className="ml-auto text-xs text-ink-subtle tabular-nums">
              {counts.all ?? 0}
            </span>
          </Button>
          {spaces.map((space) => {
            const style = spaceStyle(space.name);
            return (
              <Button
                key={space.name}
                variant="nav"
                className={
                  visibleSpace === space.name ? "bg-canvas font-semibold text-ink" : ""
                }
                onClick={() => setSpace(space.name)}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: style.dot }}
                />
                {style.label}
                <span className="ml-auto text-xs text-ink-subtle tabular-nums">
                  {counts[space.name] ?? 0}
                </span>
              </Button>
            );
          })}
          <form className="flex gap-1.5 px-3 pt-1 pb-2" onSubmit={(e) => void onCreate(e)}>
            <input
              className="min-w-0 flex-1 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New space"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="cursor-pointer rounded-md border border-line bg-elevated px-2.5 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
          {visibleSpace !== "all" && visibleSpace !== "default" && (
            <Button variant="nav" onClick={() => void removeSpace()} disabled={busy}>
              <Icon name="trash" />
              Delete space
            </Button>
          )}
          <p className="mt-4 px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.08em] text-ink-subtle uppercase">
            Discover
          </p>
          <Button
            variant="nav"
            onClick={() => {
              setRightPanelOpen(true);
              showToast("Related memories are in Insights");
            }}
          >
            <Icon name="link" />
            Connections
          </Button>
          <Button
            variant="nav"
            onClick={() => {
              setRightPanelOpen(true);
              showToast("Daily digest is generated from today's saves");
            }}
          >
            <Icon name="clock" />
            Daily Digest
          </Button>
          <Button
            variant="nav"
            onClick={() => showToast("Memory Graph visualization coming later")}
          >
            <Icon name="graph" />
            Memory Graph
          </Button>
        </nav>
        <div className="mt-auto border-t border-line p-4">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
