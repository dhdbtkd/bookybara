"use client";

import { Badge } from "@/components/ui/badge";

type Member = { id: number; name: string };

interface Props {
  members: Member[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function MemberMultiSelect({ members, selected, onChange }: Props) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  if (members.length === 0) {
    return <p className="text-xs text-neutral-400">등록된 멤버가 없습니다. 먼저 멤버를 추가해주세요.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const isSelected = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                isSelected
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-300 border-neutral-200 hover:border-neutral-400 hover:text-neutral-500"
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {m.name}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-neutral-400">{selected.length}명 선택됨</p>
      )}
    </div>
  );
}
