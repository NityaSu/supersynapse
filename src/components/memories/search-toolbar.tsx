"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/cn";
import { spaceStyle } from "@/lib/space-style";

export function SearchToolbar() {
  const {
    spaces,
    currentFilter,
    semanticMode,
    searchQuery,
    setCurrentFilter,
    setSearchQuery,
    toggleSemantic,
  } = useWorkspace();

  const chips = [
    { id: "all", label: "All" },
    ...spaces.slice(0, 6).map((s) => ({
      id: s.name,
      label: spaceStyle(s.name).label,
    })),
    { id: "recent", label: "Recent" },
    { id: "favorites", label: "Favorites" },
  ];

  return (
    <>
      <div className="relative mb-4">
        <div className="relative flex items-center">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle"
          />
          <input
            className="w-full rounded-[14px] border border-line bg-elevated py-3 pr-[120px] pl-[42px] text-sm text-ink shadow-soft outline-none placeholder:text-ink-subtle focus:border-brand focus:shadow-[0_0_0_3px_rgba(255,102,0,0.1),var(--ss-shadow-soft)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your memories..."
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition",
                semanticMode
                  ? "border-brand/20 bg-brand-light text-brand"
                  : "border-line bg-canvas text-ink-muted"
              )}
              onClick={toggleSemantic}
            >
              <Icon name="bolt" size={12} />
              {semanticMode ? "Semantic" : "Keyword"}
            </button>
          </div>
        </div>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <Button
            key={chip.id}
            variant="chip"
            className={
              currentFilter === chip.id
                ? "border-ink bg-ink text-canvas"
                : "border-line bg-elevated text-ink-muted hover:border-line-hover hover:text-ink"
            }
            onClick={() => setCurrentFilter(chip.id)}
          >
            {chip.label}
          </Button>
        ))}
      </div>
    </>
  );
}
