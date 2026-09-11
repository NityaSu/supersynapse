"use client";

import { useEffect } from "react";
import { AddMemoryModal } from "@/components/memories/add-memory-modal";
import { MemoryDetailModal } from "@/components/memories/memory-detail-modal";
import { MemoryFeed } from "@/components/memories/memory-feed";
import { CommandPalette } from "@/components/shell/command-palette";
import { InsightsPanel } from "@/components/shell/insights-panel";
import { Sidebar } from "@/components/shell/sidebar";
import { Toast } from "@/components/shell/toast";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-provider";

function Hotkeys() {
  const { setCmdOpen, setAddOpen, closeOverlays } = useWorkspace();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAddOpen(true);
      }
      if (e.key === "Escape") closeOverlays();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setCmdOpen, setAddOpen, closeOverlays]);

  return null;
}

function ShellLayout() {
  const { setAddOpen } = useWorkspace();

  return (
    <>
      <Hotkeys />
      <Topbar />
      <div className="flex min-h-screen pt-14">
        <Sidebar />
        <MemoryFeed />
        <InsightsPanel />
      </div>
      <Button
        className="fixed right-6 bottom-6 z-50 size-14 rounded-full p-0 shadow-[0_4px_16px_rgba(255,102,0,0.35)] hover:scale-105 lg:hidden"
        onClick={() => setAddOpen(true)}
        aria-label="New memory"
      >
        <Icon name="plus" size={24} />
      </Button>
      <AddMemoryModal />
      <MemoryDetailModal />
      <CommandPalette />
      <Toast />
    </>
  );
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <ShellLayout />
    </WorkspaceProvider>
  );
}
