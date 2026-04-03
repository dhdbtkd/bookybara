"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

type Review = {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  books: { title: string; author: string; cover_url: string | null; cover_url_hires: string | null } | null;
  meetings: { id: number; title: string; date: string } | null;
};

export default function ReviewDetailClient({ review }: { review: Review }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [authorName, setAuthorName] = useState(review.author_name);
  const [content, setContent] = useState(review.content);
  const [saving, setSaving] = useState(false);

  const book = review.books;
  const meeting = review.meetings;

  async function handleSave() {
    if (!content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_name: authorName.trim(), content: content.trim() }),
    });
    if (res.ok) {
      toast.success("수정되었습니다.");
      setEditing(false);
      router.refresh();
    } else {
      const { error } = await res.json();
      toast.error(error ?? "오류가 발생했습니다.");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ minHeight: "calc(100dvh - 120px)" }}>
      {/* 브레드크럼 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-[#9C8E7E] hover:text-[#1C1A17] transition-colors duration-200 mb-8 group cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
        뒤로가기
      </button>

      {/* 메타 태그 */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {book && (
          <span className="text-[10px] font-bold tracking-widest border border-[#C8956C]/60 text-[#8B3A2A] px-3 py-1 uppercase rounded-full">
            {book.title}
          </span>
        )}
        {meeting && (
          <span className="text-[10px] font-bold tracking-widest border border-[#D4C5B0] text-[#9C8E7E] px-3 py-1 uppercase rounded-full">
            {meeting.title}
          </span>
        )}
      </div>

      {/* 헤더 */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-12 h-12 rounded-full bg-[#1C1A17] flex items-center justify-center flex-shrink-0">
          <span className="text-base text-[#F0EAE0] font-semibold">
            {review.author_name.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1C1A17]">{authorName}</h1>
          <p className="text-xs text-[#9C8E7E] mt-1 tracking-wide">
            {format(new Date(review.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {book && (book.cover_url_hires || book.cover_url) && !editing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(book.cover_url_hires || book.cover_url)!}
              alt={book.title}
              className="w-14 h-20 object-cover rounded-xl shadow-md"
            />
          )}
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-[#D4C5B0] mb-8" />

      {/* 본문 */}
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full text-sm leading-[1.85] text-[#2C2520] border border-[#D4C5B0] rounded-xl p-4 bg-[#FDFAF7] outline-none focus:border-[#C8956C] resize-none mb-6"
        />
      ) : (
        <div className="text-sm leading-[1.85] text-[#2C2520] whitespace-pre-wrap mb-10">
          {content}
        </div>
      )}

      {/* 하단 */}
      <div className="border-t border-[#D4C5B0] pt-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-[#9C8E7E] hover:text-[#1C1A17] transition-colors duration-200 cursor-pointer"
        >
          ← 뒤로가기
        </button>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditing(false); setAuthorName(review.author_name); setContent(review.content); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#D4C5B0] text-sm text-[#9C8E7E] hover:bg-[#F0EAE0] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1C1A17] text-sm font-medium text-[#F0EAE0] hover:bg-[#8B3A2A] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />{saving ? "저장 중..." : "저장"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1C1A17] text-sm font-medium text-[#F0EAE0] hover:bg-[#8B3A2A] transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />수정
          </button>
        )}
      </div>
    </div>
  );
}
