"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { CalendarDays, MapPin, Users, FileText, ChevronLeft, BookOpen } from "lucide-react";

type Meeting = {
  id: number; title: string; date: string; location: string | null; summary: string | null;
  books: { title: string; author: string; cover_url: string | null } | null;
};
type Attendee = { id: number; name: string; created_at: string };
type Review = { id: number; author_name: string; content: string; created_at: string };

export default function MeetingDetailPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/meetings/${id}`);
    const data = await res.json();
    setMeeting(data.meeting);
    setAttendees(data.attendees);
    setReviews(data.reviews);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function addAttendee(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch(`/api/meetings/${id}/attendees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) { setNewName(""); load(); }
    else { const { error } = await res.json(); toast.error(error); }
  }

  if (loading) return <div className="text-sm text-neutral-400 pt-10 text-center">불러오는 중...</div>;
  if (!meeting) return <div className="text-sm text-neutral-400 pt-10 text-center">모임을 찾을 수 없습니다.</div>;

  const book = meeting.books;
  const isPast = meeting.date < new Date().toISOString().split("T")[0];

  return (
    <div className="-mx-4 -mt-4 md:-mt-8">
      {/* ── Hero ── */}
      <div className="relative bg-[#1C1A17] overflow-hidden">
        {/* 배경 북커버 블러 */}
        {book?.cover_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 scale-110"
            style={{ backgroundImage: `url(${book.cover_url})`, filter: "blur(20px)" }}
          />
        )}
        <div className="relative px-4 sm:px-8 pt-8 pb-10">
          {/* 브레드크럼 */}
          <Link href="/meetings" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mb-6">
            <ChevronLeft className="w-3.5 h-3.5" />
            모임 일정
          </Link>

          <div className="flex gap-6 sm:gap-10 items-start">
            {/* 책 표지 */}
            <div className="flex-shrink-0 hidden sm:block">
              {book?.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-28 h-40 object-cover rounded-lg shadow-2xl"
                  style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.5))" }}
                />
              ) : (
                <div className="w-28 h-40 rounded-lg bg-white/10 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white/30" />
                </div>
              )}
            </div>

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#C8956C] mb-2">
                {isPast ? "지난 모임" : "예정된 모임"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-1">{meeting.title}</h1>
              {book && <p className="text-sm text-white/50 mb-4">{book.title} · {book.author}</p>}

              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <CalendarDays className="w-4 h-4 text-white/40" />
                  {format(new Date(meeting.date + "T00:00:00"), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                </span>
                {meeting.location && (
                  <span className="flex items-center gap-1.5 text-sm text-white/70">
                    <MapPin className="w-4 h-4 text-white/40" />
                    {meeting.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <Users className="w-4 h-4 text-white/40" />
                  {attendees.length}명 참석
                </span>
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <FileText className="w-4 h-4 text-white/40" />
                  독후감 {reviews.length}개
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 items-start">

        {/* Left: 요약 + 독후감 */}
        <div className="space-y-8">
          {/* 토론 요약 */}
          {meeting.summary && (
            <div>
              <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-neutral-400 mb-3">토론 요약</h2>
              <p className="text-sm text-[#3C3530] leading-relaxed whitespace-pre-wrap bg-[#F8F5F0] rounded-2xl p-5">
                {meeting.summary}
              </p>
            </div>
          )}

          {/* 독후감 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-neutral-400">
                독후감 ({reviews.length})
              </h2>
              <Link
                href={`/reviews/new?meetingId=${id}`}
                className="px-3 py-1.5 bg-[#1C1A17] text-white text-xs font-semibold rounded-lg hover:bg-[#8B3A2A] transition-colors"
              >
                독후감 쓰기
              </Link>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Link key={r.id} href={`/reviews/${r.id}`} className="block group">
                    <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-4 hover:border-neutral-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-[#1C1A17]">{r.author_name}</span>
                          <p className="text-sm text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{r.content}</p>
                        </div>
                        <span className="text-xs text-neutral-400 flex-shrink-0 pt-0.5">
                          {format(new Date(r.created_at), "M/d", { locale: ko })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-100 p-8 text-center">
                <p className="text-sm text-neutral-400 mb-3">아직 독후감이 없습니다.</p>
                <Link
                  href={`/reviews/new?meetingId=${id}`}
                  className="text-xs text-[#8B3A2A] hover:underline underline-offset-2"
                >
                  첫 번째 독후감 작성하기 →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right: 참석자 */}
        <div className="sticky top-20">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-neutral-400 mb-3">
            참석자 ({attendees.length}명)
          </h2>
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {attendees.length > 0 ? attendees.map((a) => (
                <Badge key={a.id} variant="secondary" className="text-xs">{a.name}</Badge>
              )) : (
                <p className="text-sm text-neutral-400">아직 참석자가 없습니다.</p>
              )}
            </div>
            <div className="h-px bg-neutral-100" />
            <form onSubmit={addAttendee} className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="이름 입력"
                className="flex-1 text-sm"
                maxLength={20}
              />
              <Button type="submit" size="sm" className="cursor-pointer">등록</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
