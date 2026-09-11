"use client";

import { useState } from "react";
import { RelatedMemory } from "@/components/memories/related-memory";
import { Overlay } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/cn";
import type { Memory } from "@/lib/memories";

function PanelHeader({
  icon,
  title,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase [&_svg]:size-4 [&_svg]:text-brand">
      <Icon name={icon} size={16} />
      <h3>{title}</h3>
    </div>
  );
}

export function InsightsPanel() {
  const {
    memories,
    spaces,
    related,
    digest,
    retrieval,
    rightPanelOpen,
    setRightPanelOpen,
    openDetail,
    ask,
    showToast,
  } = useWorkspace();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Memory[]>([]);
  const [asking, setAsking] = useState(false);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    const result = await ask(question);
    setAnswer(result.answer);
    setCitations(result.citations);
    setAsking(false);
  }

  const stats = [
    [memories.length, "Memories", false],
    [related.length, "Connections", false],
    [spaces.length, "Spaces", false],
    [retrieval, "Retrieval", true],
  ] as const;

  return (
    <>
      <Overlay
        open={rightPanelOpen}
        onClick={() => setRightPanelOpen(false)}
        className="z-30 bg-black/20 xl:hidden"
      />
      <aside
        className={cn(
          "fixed top-14 right-0 bottom-0 z-40 w-[300px] translate-x-full overflow-y-auto border-l border-line bg-surface transition-transform duration-300 xl:translate-x-0",
          rightPanelOpen && "translate-x-0"
        )}
      >
        <section className="border-b border-line p-5">
          <PanelHeader icon="clock" title="Daily Digest" />
          <div className="rounded-[10px] border border-line bg-canvas p-3.5">
            <p className="text-[13px] leading-6 text-ink-secondary">{digest}</p>
          </div>
        </section>
        <section className="border-b border-line p-5">
          <PanelHeader icon="link" title="Related to Recent" />
          {related.length === 0 ? (
            <p className="text-sm text-ink-muted">Related memories will appear here.</p>
          ) : (
            related.map((memory) => (
              <RelatedMemory key={memory.id} memory={memory} onOpen={openDetail} />
            ))
          )}
        </section>
        <section className="border-b border-line p-5">
          <PanelHeader icon="chart" title="This Week" />
          <div className="grid grid-cols-2 gap-2">
            {stats.map(([value, label, accent]) => (
              <div
                key={label}
                className="rounded-[10px] border border-line bg-elevated px-2.5 py-3.5 text-center"
              >
                <div
                  className={cn(
                    "text-[22px] font-extrabold",
                    accent ? "text-brand" : "text-ink"
                  )}
                >
                  {value}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">{label}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="border-b border-line p-5">
          <PanelHeader icon="ask" title="Ask" />
          <form className="flex flex-col gap-2" onSubmit={(e) => void onAsk(e)}>
            <input
              className="w-full rounded-[10px] border border-line bg-canvas px-3 py-2.5 text-[13px] text-ink outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(255,102,0,0.1)]"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
            />
            <Button type="submit" disabled={asking || !question.trim()}>
              {asking ? "Thinking…" : "Ask"}
            </Button>
          </form>
          {answer && (
            <div className="mt-2.5 whitespace-pre-wrap rounded-[10px] border border-line bg-canvas p-3 text-[13px] leading-6 text-ink-secondary">
              {answer}
            </div>
          )}
          {citations.slice(0, 2).map((memory) => (
            <RelatedMemory
              key={memory.id}
              memory={memory}
              onOpen={openDetail}
              className="mt-2"
            />
          ))}
        </section>
        <section className="p-5">
          <PanelHeader icon="bolt" title="Quick Capture" />
          <div className="flex gap-2">
            <Button variant="quick" onClick={() => showToast("URL clipper coming later")}>
              <Icon name="link" size={14} />
              Clip URL
            </Button>
            <Button
              variant="quick"
              onClick={() => showToast("Photo capture coming later")}
            >
              <Icon name="camera" size={14} />
              Photo
            </Button>
          </div>
        </section>
      </aside>
    </>
  );
}
