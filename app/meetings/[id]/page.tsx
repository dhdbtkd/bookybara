"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, Plus, X, PenLine, CalendarDays, MapPin, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Meeting = {
  id: number; title: string; date: string; location: string | null; summary: string | null;
  books: { title: string; author: string; cover_url: string | null } | null;
};
type Attendee = { id: number; name: string; member_id: number | null; created_at: string };
type Review = { id: number; author_name: string; content: string; created_at: string };
type Member = { id: number; name: string };

export default function MeetingDetailPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  async function load() {
    const [res, membersRes] = await Promise.all([
      fetch(`/api/meetings/${id}`),
      fetch("/api/members"),
    ]);
    const data = await res.json();
    setMeeting(data.meeting);
    setAttendees(data.attendees);
    setReviews(data.reviews);
    setMembers(await membersRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function openModal() {
    setSelected(new Set());
    setModalOpen(true);
  }

  async function confirmAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    const toAdd = members.filter((m) => selected.has(m.id));
    await Promise.all(toAdd.map((m) =>
      fetch(`/api/meetings/${id}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: m.name, member_id: m.id }),
      })
    ));
    setAdding(false);
    setModalOpen(false);
    load();
  }

  if (loading) return <div className="text-sm text-neutral-400 pt-10 text-center">불러오는 중...</div>;
  if (!meeting) return <div className="text-sm text-neutral-400 pt-10 text-center">모임을 찾을 수 없습니다.</div>;

  const book = meeting.books;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const meetingDate = new Date(meeting.date + "T00:00:00");
  const diffDays = Math.round((meetingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = diffDays < 0;
  const dday = diffDays === 0 ? "D-Day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;

  return (
    <div className="space-y-10 md:space-y-14">

      {/* ── 브레드크럼 ── */}
      <Link href="/meetings" className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-600 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" />
        모임 일정
      </Link>

      {/* ── 상단 히어로: 타이틀 + 북커버 ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">

        {/* 왼쪽: 타이틀 + 메타 + 통계 */}
        <div>
          <h1
            className="text-4xl sm:text-5xl font-bold text-[#1C1A17] leading-[1.1] mb-8"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {meeting.title}
          </h1>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3 pb-3 border-b border-neutral-200/60">
              <CalendarDays className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-400 mb-0.5">날짜</p>
                <p className="text-sm font-medium text-[#1C1A17]">
                  {format(new Date(meeting.date + "T00:00:00"), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                </p>
                <p className={cn(
                  "text-xs font-bold mt-1",
                  diffDays === 0 ? "text-[#8B3A2A]" : isPast ? "text-neutral-300" : "text-[#C8956C]"
                )}>
                  {dday}
                </p>
              </div>
            </div>
            {meeting.location && (
              <div className="flex items-start gap-3 pb-3 border-b border-neutral-200/60">
                <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-400 mb-0.5">장소</p>
                  <p className="text-sm font-medium text-[#1C1A17]">{meeting.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* 통계 */}
          <div className="flex gap-8 items-center">
            <div>
              <p className="text-4xl font-bold text-[#1C1A17]">{attendees.length}</p>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-neutral-400 mt-1">참석</p>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <div>
              <p className="text-4xl font-bold text-[#1C1A17]">{reviews.length}</p>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-neutral-400 mt-1">독후감</p>
            </div>
            <div className="ml-2">
              <span className={cn(
                "text-[9px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full",
                isPast ? "bg-neutral-100 text-neutral-400" : "bg-[#C8956C]/15 text-[#C8956C]"
              )}>
                {isPast ? "지난 모임" : "예정된 모임"}
              </span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 북커버 (책 비율 2:3) */}
        <div className="flex-shrink-0 mx-auto md:mx-0" style={{ width: "clamp(140px, 22vw, 220px)" }}>
          <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ aspectRatio: "2 / 3" }}>
            {book?.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[#2C2926] flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-white/20" />
              </div>
            )}
            {book && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p
                    className="text-white font-semibold text-sm leading-snug"
                    style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
                  >
                    {book.title}
                  </p>
                  <p className="text-white/60 text-[9px] tracking-[0.15em] uppercase mt-1">{book.author}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 구분선 ── */}
      <div className="h-px bg-neutral-200" />

      {/* ── 바디: 독후감 + 사이드바 ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-12 items-start">

        {/* 왼쪽: 독후감 */}
        <div className="order-2 md:order-1">
          <div className="flex items-end justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-playfair)" }}>
                독후감
              </h2>
              <p className="text-xs text-neutral-400 mt-1">모임 멤버들의 생각과 감상을 담았습니다.</p>
            </div>
            <Link
              href={`/reviews/new?meetingId=${id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1A17] text-white text-xs font-semibold rounded-full hover:bg-[#8B3A2A] transition-colors flex-shrink-0"
            >
              <PenLine className="w-3.5 h-3.5" /> 독후감 쓰기
            </Link>
          </div>
          <div className="h-px bg-neutral-200 mb-8 mt-4" />

          {reviews.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-neutral-400 text-sm mb-2">아직 독후감이 없습니다.</p>
              <Link href={`/reviews/new?meetingId=${id}`} className="text-xs text-[#8B3A2A] hover:underline underline-offset-2">
                첫 번째 독후감 작성하기 →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Link key={r.id} href={`/reviews/${r.id}`} className="block group">
                  <div className="rounded-2xl border border-neutral-200/80 bg-white/60 px-5 py-5 hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-[#1C1A17] group-hover:bg-[#8B3A2A] flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                        <span className="text-[11px] font-bold text-white">{r.author_name.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#1C1A17]">{r.author_name}</p>
                        <p className="text-xs text-neutral-400">{format(new Date(r.created_at), "yyyy년 M월 d일", { locale: ko })}</p>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-500 leading-relaxed line-clamp-4 group-hover:text-[#3C3530] transition-colors duration-200">
                      {r.content}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="sticky top-20 space-y-8 order-1 md:order-2">

          {/* 참석자 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-neutral-400">참석자</p>
              <button
                onClick={openModal}
                className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-neutral-400 hover:text-[#1C1A17] transition-colors cursor-pointer uppercase"
              >
                <Plus className="w-3 h-3" /> 추가
              </button>
            </div>
            {attendees.length === 0 ? (
              <p className="text-xs text-neutral-400">아직 참석자가 없습니다.</p>
            ) : (
              <div className="space-y-2.5">
                {attendees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8956C] flex-shrink-0" />
                    <span className="text-sm text-[#1C1A17]">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 토론 요약 */}
          {meeting.summary && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-neutral-400 mb-3">토론 요약</p>
              <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-wrap">{meeting.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 참석자 추가 모달 ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1C1A17]">참석자 선택</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const attendedMemberIds = new Set(attendees.map((a) => a.member_id).filter(Boolean));
              const attendedNames = new Set(attendees.map((a) => a.name));
              const allAdded = members.every((m) => attendedMemberIds.has(m.id) || attendedNames.has(m.name));

              if (members.length === 0) return <p className="text-sm text-neutral-400 text-center py-4">등록된 멤버가 없습니다.</p>;

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const alreadyIn = attendedMemberIds.has(m.id) || attendedNames.has(m.name);
                      const isSelected = selected.has(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={alreadyIn}
                          onClick={() => {
                            if (alreadyIn) return;
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                              return next;
                            });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                            alreadyIn
                              ? "bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed"
                              : isSelected
                                ? "bg-[#1C1A17] text-white border-[#1C1A17] cursor-pointer"
                                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 cursor-pointer"
                          )}
                        >
                          {alreadyIn ? <span className="line-through">{m.name}</span> : m.name}
                        </button>
                      );
                    })}
                  </div>

                  {allAdded && (
                    <p className="text-xs text-neutral-400 text-center">모든 멤버가 이미 참석자로 등록되어 있습니다.</p>
                  )}

                  <Button
                    onClick={confirmAdd}
                    disabled={selected.size === 0 || adding}
                    className="w-full bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer rounded-xl"
                  >
                    {adding ? "추가 중..." : `${selected.size > 0 ? `${selected.size}명 ` : ""}참석자 추가`}
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
