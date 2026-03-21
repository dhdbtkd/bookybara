"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Tag, Plus } from "lucide-react";

type Category = { id: number; name: string; color: string };

interface Props {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  onAddCategory?: (name: string, color: string) => Promise<Category | null>;
}

export default function CategorySelect({ categories, value, onChange, onAddCategory }: Props) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addColor, setAddColor] = useState("#6B7280");
  const [saving, setSaving] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => String(c.id) === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
      setAdding(false);
      setAddName("");
      setAddColor("#6B7280");
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    setOpen((p) => !p);
  }

  async function handleAddConfirm() {
    if (!addName.trim() || !onAddCategory) return;
    setSaving(true);
    const created = await onAddCategory(addName.trim(), addColor);
    setSaving(false);
    if (created) {
      onChange(String(created.id));
      setAdding(false);
      setAddName("");
      setAddColor("#6B7280");
      setOpen(false);
    }
  }

  const ITEM_H = 32;
  const MAX_VISIBLE = 6;
  // +1 for "없음", +1 for "추가" button (if onAddCategory provided)
  const extraRows = onAddCategory ? 2 : 1;
  const totalItems = categories.length + extraRows;
  const scrollableItems = categories.length + 1; // "없음" + categories scroll
  const listHeight = Math.min(scrollableItems, MAX_VISIBLE) * ITEM_H + 8 + (onAddCategory ? (adding ? 48 : ITEM_H) : 0);
  const openUpward = rect ? window.innerHeight - rect.bottom - 4 < listHeight : false;

  const dropdown = open && rect && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      }}
      className="rounded-md border bg-white shadow-lg py-1 flex flex-col"
    >
      {/* 스크롤 영역: 없음 + 카테고리 목록 */}
      <div style={{ maxHeight: Math.min(scrollableItems, MAX_VISIBLE) * ITEM_H + 8, overflowY: scrollableItems > MAX_VISIBLE ? "auto" : "visible" }}>
        <button
          type="button"
          onClick={() => { onChange(""); setOpen(false); }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-50 cursor-pointer"
        >
          <span className="w-3 h-3 rounded-sm border border-neutral-200 flex-shrink-0" />
          없음
          {!value && <Check className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { onChange(String(c.id)); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-50 cursor-pointer"
          >
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="flex-1 text-left">{c.name}</span>
            {String(c.id) === value && <Check className="w-3.5 h-3.5 ml-auto text-neutral-600" />}
          </button>
        ))}
      </div>

      {/* 카테고리 추가 — 구분선 아래 고정 */}
      {onAddCategory && (
        <div className="border-t border-neutral-100 mt-1 pt-1">
          {adding ? (
            <div className="flex items-center gap-1.5 px-2 py-1">
              <input
                type="color"
                value={addColor}
                onChange={(e) => setAddColor(e.target.value)}
                className="w-6 h-6 rounded border cursor-pointer flex-shrink-0 p-0"
                title="색상"
              />
              <input
                autoFocus
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAddConfirm(); }
                  if (e.key === "Escape") { setAdding(false); setAddName(""); }
                }}
                placeholder="이름 입력"
                maxLength={20}
                className="flex-1 min-w-0 text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-neutral-400"
              />
              <button
                type="button"
                onClick={handleAddConfirm}
                disabled={!addName.trim() || saving}
                className="text-xs px-2 py-1 bg-[#1C1A17] text-white rounded cursor-pointer disabled:opacity-40 flex-shrink-0"
              >
                {saving ? "…" : "추가"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              카테고리 추가
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        {selected ? (
          <>
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="flex-1 text-left">{selected.name}</span>
          </>
        ) : (
          <>
            <Tag className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span className="flex-1 text-left text-muted-foreground">카테고리 선택</span>
          </>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
      </button>
      {dropdown}
    </div>
  );
}
