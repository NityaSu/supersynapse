"use client";

import { useWorkspace } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/cn";

export function Toast() {
  const { toast, toastOn } = useWorkspace();
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-[500] max-w-[min(480px,calc(100vw-32px))] -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-center text-sm font-semibold text-canvas shadow-pop transition",
        toastOn ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      )}
    >
      {toast}
    </div>
  );
}
