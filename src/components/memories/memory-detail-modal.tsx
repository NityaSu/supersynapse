"use client";

import { useState } from "react";
import { RelatedMemory } from "@/components/memories/related-memory";
import { SpaceBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { formatDate } from "@/lib/format";
import type { Memory } from "@/lib/memories";
import { spaceStyle } from "@/lib/space-style";

function DetailBody({ detail }: { detail: Memory }) {
  const { related, favorites, closeDetail, openDetail, toggleFavorite, saveMemory, removeMemory } =
    useWorkspace();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(detail.content);
  const [saving, setSaving] = useState(false);
  const style = spaceStyle(detail.containerTag);

  async function onSave() {
    if (!editContent.trim()) return;
    setSaving(true);
    const ok = await saveMemory(detail.id, editContent.trim());
    if (ok) setEditing(false);
    setSaving(false);
  }

  return (
    <>
      <ModalHeader>
        <div className="flex items-center gap-2">
          <SpaceBadge
            label={style.label}
            background={style.badgeBg}
            color={style.badgeText}
          />
          <span className="text-xs text-ink-muted">
            {formatDate(detail.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            title="Favorite"
            onClick={() => toggleFavorite(detail.id)}
          >
            <Icon
              name="star"
              size={18}
              fill={favorites.has(detail.id) ? "currentColor" : "none"}
              className={favorites.has(detail.id) ? "text-brand" : "text-ink-muted"}
            />
          </Button>
          <Button variant="ghost" title="Edit" onClick={() => setEditing((v) => !v)}>
            <Icon name="edit" />
          </Button>
          <Button
            variant="ghost"
            title="Delete"
            onClick={() => void removeMemory(detail.id)}
          >
            <Icon name="trash" />
          </Button>
          <Button variant="ghost" className="-m-1" onClick={closeDetail}>
            <Icon name="x" size={20} />
          </Button>
        </div>
      </ModalHeader>
      <div className="p-6">
        {editing ? (
          <>
            <textarea
              className="min-h-[120px] w-full resize-y rounded-[10px] border border-line bg-canvas px-3.5 py-3.5 text-sm leading-6 text-ink outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(255,102,0,0.1)]"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={saving}
            />
            <div className="mt-3 flex gap-2">
              <Button
                className="w-auto px-4 py-2"
                onClick={() => void onSave()}
                disabled={saving || !editContent.trim()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setEditContent(detail.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <p className="mb-4 whitespace-pre-wrap text-[15px] leading-7 text-ink-secondary">
            {detail.content}
          </p>
        )}
        {related.length > 0 && (
          <div>
            <h4 className="mb-2.5 text-xs font-bold tracking-wide text-ink-muted uppercase">
              Related Memories
            </h4>
            {related.map((memory) => (
              <RelatedMemory key={memory.id} memory={memory} onOpen={openDetail} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function MemoryDetailModal() {
  const { detail, closeDetail } = useWorkspace();
  return (
    <Modal open={Boolean(detail)} onClose={closeDetail} maxWidth="max-w-[640px]">
      {detail ? <DetailBody key={detail.id} detail={detail} /> : null}
    </Modal>
  );
}
