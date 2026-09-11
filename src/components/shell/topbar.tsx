"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { useWorkspace } from "@/components/workspace/workspace-provider";

export function Topbar() {
  const {
    theme,
    setSidebarOpen,
    setRightPanelOpen,
    setCmdOpen,
    toggleTheme,
  } = useWorkspace();

  return (
    <header className="fixed inset-x-0 top-0 z-[100] flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-5 backdrop-blur-[20px] backdrop-saturate-[1.8]">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="-ml-1 lg:hidden"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Open menu"
        >
          <Icon name="menu" />
        </Button>
        <a
          href="#"
          className="flex items-center gap-2.5 text-ink no-underline"
          onClick={(e) => e.preventDefault()}
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-white shadow-[0_2px_8px_rgba(255,102,0,0.25)]">
            <Icon name="bolt" size={18} />
          </div>
          <span className="text-base font-bold tracking-tight">Supersynapse</span>
          <span className="rounded-full border border-brand/15 bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">
            Beta
          </span>
        </a>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-1.5 text-[13px] text-ink-muted transition hover:border-line-hover hover:text-ink"
          onClick={() => setCmdOpen(true)}
        >
          <Icon name="search" size={14} />
          Search
          <Kbd>⌘K</Kbd>
        </button>
        <Button
          variant="ghost"
          className="xl:hidden"
          onClick={() => setRightPanelOpen((v) => !v)}
          title="Insights"
        >
          <Icon name="info" />
        </Button>
        <Button variant="ghost" onClick={toggleTheme} title="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </Button>
        <Avatar />
      </div>
    </header>
  );
}
