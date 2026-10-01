"use client";

import { MemoryCard } from "@/components/memories/memory-card";
import { ResurfaceSection } from "@/components/memories/resurface-section";
import { SearchToolbar } from "@/components/memories/search-toolbar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/cn";

export function MemoryFeed() {
  const {
    loading,
    filtered,
    memories,
    favorites,
    semanticMode,
    searchQuery,
    searchMode,
    viewMode,
    viewTitle,
    viewSubtitle,
    setViewMode,
    setAddOpen,
    openDetail,
  } = useWorkspace();

  return (
    <main className="min-w-0 flex-1 lg:ml-[260px] xl:mr-[300px]">
      <div className="mx-auto max-w-[720px] px-4 py-4 pb-20 lg:px-5 lg:py-6">
        <div className="mb-14 flex flex-col items-center text-center">
          <h1 className="font-display mb-2 text-[26px] font-bold tracking-[-1px] text-ink sm:text-[32px]">
            What is true now?
          </h1>
          <p className="max-w-[34rem] text-[15px] leading-[1.6] text-ink-muted">
            Drop a thought. Supersynapse extracts facts and keeps the latest one
            when you change your mind.
          </p>
        </div>
        <SearchToolbar />
        <ResurfaceSection />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight lg:text-xl">
              {viewTitle}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {viewSubtitle}
              {semanticMode && searchQuery.trim() && searchMode
                ? ` · ${searchMode} search`
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-lg border border-line bg-elevated p-1">
            <Button
              variant="ghost"
              className={cn(
                "size-auto p-1.5",
                viewMode === "list"
                  ? "bg-canvas text-ink shadow-soft"
                  : "text-ink-subtle"
              )}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <Icon name="list" size={16} />
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "size-auto p-1.5",
                viewMode === "grid"
                  ? "bg-canvas text-ink shadow-soft"
                  : "text-ink-subtle"
              )}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <Icon name="grid" size={16} />
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted">Loading facts…</p>
        ) : memories.length === 0 && !searchQuery.trim() ? (
          <div className="animate-fade rounded-[14px] border border-line bg-elevated px-5 py-8 text-left sm:px-8">
            <h3 className="mb-4 text-lg font-bold">How this works</h3>
            <ol className="mb-6 list-decimal space-y-3 pl-5 text-sm leading-6 text-ink-secondary">
              <li>
                Drop a thought:{" "}
                <span className="text-ink">“We use Postgres.”</span>
              </li>
              <li>
                Later, drop the update:{" "}
                <span className="text-ink">“We moved to Mongo.”</span>
              </li>
              <li>
                Ask “What database do we use?” — you get Mongo, and Postgres is
                marked old.
              </li>
            </ol>
            <Button
              className="w-auto px-5 py-2"
              onClick={() => setAddOpen(true)}
            >
              <Icon name="plus" size={16} />
              Drop a thought
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="animate-fade px-5 py-[60px] text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-brand-light text-brand">
              <Icon name="empty" size={32} />
            </div>
            <h3 className="mb-1.5 text-lg font-bold">No matching facts</h3>
            <p className="text-sm text-ink-muted">
              Try a different search, or drop another thought.
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3"
                : "flex flex-col gap-3"
            }
          >
            {filtered.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                favorited={favorites.has(memory.id)}
                matchScore={
                  semanticMode && searchQuery.trim() && typeof memory.score === "number"
                    ? Math.round(memory.score * 100)
                    : null
                }
                onOpen={openDetail}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
