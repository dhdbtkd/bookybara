"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Tag } from "lucide-react";

type Category = { id: number; name: string; color: string };

interface Props {
  categories: Category[];
  value: string; // category id as string
  onChange: (id: string) => void;
}

export default function CategorySelect({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => String(c.id) === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        {selected ? (
          <>
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
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

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg py-1">
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
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="flex-1 text-left">{c.name}</span>
              {String(c.id) === value && <Check className="w-3.5 h-3.5 ml-auto text-neutral-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
