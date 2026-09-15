"use client";

import { Check } from "lucide-react";

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
    return <p className="text-xs text-stone-500">등록된 멤버가 없습니다. 먼저 멤버를 추가해주세요.</p>;
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
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 min-h-9 px-3.5 rounded-full text-sm font-medium border tap cursor-pointer ${
                isSelected
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-stone-600 border-sand hover:border-stone-400 hover:text-ink"
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              {m.name}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-stone-500">{selected.length}명 선택됨</p>
      )}
    </div>
  );
}
