"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { ko } from "@blocknote/core/locales";
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
  initialText?: string;
}

export default function ReviewEditor({ onChange, initialText }: Props) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialContent = useMemo(() => {
    if (!initialText) return undefined;
    return initialText.split("\n").map((line) => ({
      type: "paragraph" as const,
      content: line ? [{ type: "text" as const, text: line, styles: {} }] : [],
    }));
  }, []);

  const editor = useCreateBlockNote({ dictionary: ko, initialContent });

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      onChange(blocksToPlainText(editor.document));
    });
    return () => unsubscribe?.();
  }, [editor, onChange]);

  return (
    <div
      style={{ minHeight: "40dvh", cursor: "text" }}
      onClick={() => editor.focus()}
    >
      <BlockNoteView
        editor={editor}
        theme="light"
        style={{ minHeight: "40dvh", paddingTop: "0.75rem", paddingBottom: "0.75rem", fontSize: "0.875rem" }}
      />
    </div>
  );
}
