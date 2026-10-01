"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { CaptureFact } from "@/lib/api";
import { snippet } from "@/lib/resurface";
import { spaceStyle } from "@/lib/space-style";

export function AddMemoryModal() {
  const { addOpen, setAddOpen, spaces, visibleAddSpace, setAddSpace, addMemory } =
    useWorkspace();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<CaptureFact[] | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const t = window.setTimeout(() => ref.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [addOpen]);

  function close() {
    setAddOpen(false);
    setText("");
    setError(null);
    setFacts(null);
    setSaving(false);
  }

  async function onSave() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    const result = await addMemory(text.trim(), visibleAddSpace);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFacts(result.facts);
  }

  return (
    <Modal open={addOpen} onClose={close}>
      <ModalHeader>
        <h2 className="text-base font-bold">
          {facts ? "Facts extracted" : "Drop a thought"}
        </h2>
        <Button variant="ghost" className="-m-1" onClick={close}>
          <Icon name="x" size={20} />
        </Button>
      </ModalHeader>
      {facts ? (
        <div className="overflow-y-auto p-5">
          <p className="mb-4 text-sm text-ink-muted">
            {facts.length === 0
              ? "Nothing clear enough to store as a fact. Try a full sentence."
              : `Pulled ${facts.length} fact${facts.length === 1 ? "" : "s"} from that thought.`}
          </p>
          <ul className="flex flex-col gap-3">
            {facts.map((fact) => (
              <li
                key={fact.id}
                className="rounded-[10px] border border-line bg-canvas px-3.5 py-3"
              >
                <p className="text-sm leading-6 text-ink">{fact.content}</p>
                {fact.relation === "updates" && fact.replaces ? (
                  <p className="mt-2 text-xs leading-5 text-brand">
                    Replaced: {snippet(fact.replaces.content, 80)}
                  </p>
                ) : null}
                {fact.relation === "extends" && fact.replaces ? (
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    Extends: {snippet(fact.replaces.content, 80)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="overflow-y-auto p-5">
          <textarea
            ref={ref}
            className="min-h-[120px] w-full resize-y rounded-[10px] border border-line bg-canvas px-3.5 py-3.5 text-sm leading-6 text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:shadow-[0_0_0_3px_rgba(255,102,0,0.1)]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A thought, not a title. Example: we moved from Postgres to Mongo."
          />
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      )}
      <ModalFooter>
        {facts ? (
          <>
            <div className="flex-1" />
            <Button className="w-auto px-5 py-2" onClick={close}>
              Done
            </Button>
          </>
        ) : (
          <>
            <select
              className="cursor-pointer rounded-md border border-line bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              value={visibleAddSpace}
              onChange={(e) => setAddSpace(e.target.value)}
            >
              {spaces.map((space) => (
                <option key={space.name} value={space.name}>
                  {spaceStyle(space.name).label}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              className="w-auto px-5 py-2"
              onClick={() => void onSave()}
              disabled={saving || !text.trim()}
            >
              {saving ? "Extracting facts…" : "Save thought"}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
