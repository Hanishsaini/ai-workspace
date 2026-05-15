"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCanvas } from "../hooks/use-canvas";

/**
 * Shared notes surface. Each block is edited locally and synced via
 * optimistic `canvas:op`s — the store applies them immediately and
 * reconciles when the server echoes the authoritative `serverSeq`.
 *
 * MVP conflict policy: server-ordered last-write-wins per block. Fine for
 * two users; a CRDT swap is the future-scale path.
 */
export function NotesEditor() {
  const { blocks, insertBlock, updateBlock, deleteBlock } = useCanvas();
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
        {blocks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Shared notes — anything you type here syncs to both of you and is
            visible to the AI.
          </p>
        )}
        {blocks.map((block) => (
          <div key={block.id} className="group flex items-start gap-2">
            <Textarea
              defaultValue={block.text}
              onBlur={(e) => {
                if (e.target.value !== block.text)
                  updateBlock(block.id, e.target.value);
              }}
              rows={2}
              className="resize-none"
            />
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          rows={1}
          className="min-h-[40px] resize-none"
        />
        <Button
          size="icon"
          onClick={() => {
            if (!draft.trim()) return;
            insertBlock(draft.trim());
            setDraft("");
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
