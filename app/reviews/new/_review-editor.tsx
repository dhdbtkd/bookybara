"use client";

import { useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

function blocksToPlainText(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.content) {
      const text = (block.content as any[]).map((c: any) => c.text ?? "").join("");
      if (text) lines.push(text);
    }
    if (block.children?.length) {
      const childText = blocksToPlainText(block.children);
      if (childText) lines.push(childText);
    }
  }
  return lines.join("\n");
}

interface Props {
  onChange: (plainText: string) => void;
}

export default function ReviewEditor({ onChange }: Props) {
  const editor = useCreateBlockNote();

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      onChange(blocksToPlainText(editor.document));
    });
    return () => unsubscribe?.();
  }, [editor, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      style={{ minHeight: "280px" }}
    />
  );
}
