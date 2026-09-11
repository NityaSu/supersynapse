"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { spaceStyle } from "@/lib/space-style";

export function AddMemoryModal() {
  const { addOpen, setAddOpen, spaces, visibleAddSpace, setAddSpace, addMemory } =
    useWorkspace();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const t = window.setTimeout(() => ref.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [addOpen]);

  async function onSave() {
    if (!text.trim()) return;
    setSaving(true);
    await addMemory(text.trim(), visibleAddSpace);
    setText("");
    setSaving(false);
  }

  return (
    <Modal open={addOpen} onClose={() => setAddOpen(false)}>
      <ModalHeader>
        <h2 className="text-base font-bold">New Memory</h2>
        <Button variant="ghost" className="-m-1" onClick={() => setAddOpen(false)}>
          <Icon name="x" size={20} />
        </Button>
      </ModalHeader>
      <div className="overflow-y-auto p-5">
        <textarea
          ref={ref}
          className="min-h-[120px] w-full resize-y rounded-[10px] border border-line bg-canvas px-3.5 py-3.5 text-sm leading-6 text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:shadow-[0_0_0_3px_rgba(255,102,0,0.1)]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? Type a thought, idea, or something you want to remember..."
        />
      </div>
      <ModalFooter>
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
        <Button variant="secondary" onClick={() => setAddOpen(false)}>
          Cancel
        </Button>
        <Button
          className="w-auto px-5 py-2"
          onClick={() => void onSave()}
          disabled={saving || !text.trim()}
        >
          {saving ? "Saving…" : "Save Memory"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
