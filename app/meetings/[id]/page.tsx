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
import { PieChart, Pie, Cell } from "recharts";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";

type Book = { title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
type Meeting = {
  id: number; title: string; date: string; location: string | null; summary: string | null;
  books: Book[];
};
type Attendee = { id: number; name: string; member_id: number | null; created_at: string };
type Review = { id: number; author_name: string; content: string; created_at: string };
type Member = { id: number; name: string };

function ReviewPieChart({ submitted, total }: { submitted: number; total: number }) {
  const filled = Math.min(submitted, total);
  const empty = Math.max(0, total - filled);
  const data = total === 0
    ? [{ value: 1, empty: true }]
    : [
        { value: filled, empty: false },
        { value: empty, empty: true },
      ];

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: 72, height: 72 }}>
        <PieChart width={72} height={72}>
          <Pie
            data={data}
            cx={31}
            cy={31}
            innerRadius={24}
            outerRadius={34}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.empty ? "#E8DDD0" : "#1C1A17"} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold text-[#1C1A17] leading-none">
            {total === 0 ? submitted : `${submitted}/${total}`}
          </span>
        </div>
      </div>
      <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-neutral-400">독후감</p>
    </div>
  );
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const reviewVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const reviewItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

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
  const [activeBookIdx, setActiveBookIdx] = useState(0);
  const dragX = useMotionValue(0);
  const BACK_OFFSET_X = 22;
  const BACK_OFFSET_Y = -14;
  const backScale = useTransform(dragX, [-120, 0, 120], [1, 0.92, 1]);
  const backMotionX = useTransform(dragX, [-120, 0, 120], [0, BACK_OFFSET_X, 0]);
  const backMotionY = useTransform(dragX, [-120, 0, 120], [0, BACK_OFFSET_Y, 0]);

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

  if (loading) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-sm text-neutral-400 pt-10 text-center"
    >
      <p className="font-[family-name:var(--font-playfair)] italic text-lg animate-pulse">불러오는 중...</p>
    </motion.div>
  );
  if (!meeting) return <div className="text-sm text-neutral-400 pt-10 text-center">모임을 찾을 수 없습니다.</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const meetingDate = new Date(meeting.date + "T00:00:00");
  const diffDays = Math.round((meetingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = diffDays < 0;
  const dday = diffDays === 0 ? "D-Day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-10 md:space-y-14"
    >
      {/* ── 브레드크럼 ── */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-600 transition-colors group"
      >
        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
        모임 일정
      </Link>

      {/* ── 상단 히어로 ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">

        {/* 왼쪽: 타이틀 + 메타 + 통계 */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <motion.span
            variants={fadeUp}
            className={cn(
              "inline-block text-[9px] font-bold tracking-[0.18em] uppercase px-3 py-1 rounded-full mb-4",
              isPast ? "bg-neutral-100 text-neutral-400" : "bg-[#C8956C]/15 text-[#C8956C]"
            )}
          >
            {isPast ? "지난 모임" : "예정된 모임"}
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold text-[#1C1A17] leading-[1.1] mb-8"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {meeting.title}
          </motion.h1>

          <motion.div variants={fadeUp} className="space-y-3 mb-8">
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
          </motion.div>

          <motion.div variants={fadeUp} className="flex gap-8 items-center">
            <div>
              <p className="text-4xl font-bold text-[#1C1A17]">{attendees.length}</p>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-neutral-400 mt-1">참석</p>
            </div>
            <div className="w-px h-10 bg-neutral-200" />
            <ReviewPieChart submitted={reviews.length} total={attendees.length} />
          </motion.div>
        </motion.div>

        {/* 오른쪽: 북커버 카드 스택 */}
        {(() => {
          const books = meeting.books;
          const CARD_W = 180;
          const CARD_H = 270;
          const CONTAINER_W = CARD_W + BACK_OFFSET_X + 8;
          const CONTAINER_H = CARD_H + Math.abs(BACK_OFFSET_Y) + 8;

          const frontBook = books[activeBookIdx] ?? null;
          const backBook = books.length > 1 ? books[(activeBookIdx + 1) % books.length] : null;

          function advance() {
            dragX.set(0);
            setActiveBookIdx((i) => (i + 1) % books.length);
          }

          function renderCover(b: Book | null) {
            const src = b?.cover_url_hires ?? b?.cover_url;
            return src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={b!.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[#2C2926] flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-white/20" />
              </div>
            );
          }

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
              className="flex-shrink-0 mx-auto md:mx-0 flex flex-col items-center gap-4"
            >
              {/* 카드 스택 */}
              <div className="relative" style={{ width: CONTAINER_W, height: CONTAINER_H }}>

                {/* 뒷 카드 */}
                {backBook && (
                  <motion.div
                    className="absolute rounded-2xl overflow-hidden shadow-lg cursor-pointer"
                    style={{ width: CARD_W, height: CARD_H, x: backMotionX, y: backMotionY, scale: backScale, zIndex: 1, top: Math.abs(BACK_OFFSET_Y), left: 0 }}
                    onClick={advance}
                  >
                    {renderCover(backBook)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white/80 font-medium text-xs leading-snug" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
                        {backBook.title}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 앞 카드 (드래그 가능) */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={activeBookIdx}
                    className="absolute rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing"
                    style={{ width: CARD_W, height: CARD_H, x: dragX, zIndex: 2, top: Math.abs(BACK_OFFSET_Y), left: 0 }}
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ x: -260, opacity: 0, rotate: -8, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                    drag={books.length > 1 ? "x" : false}
                    dragElastic={0.18}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (Math.abs(info.offset.x) > 60) advance();
                      else dragX.set(0);
                    }}
                  >
                    {renderCover(frontBook)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-semibold text-sm leading-snug" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
                        {frontBook?.title}
                      </p>
                      <p className="text-white/60 text-[9px] tracking-[0.15em] uppercase mt-1">{frontBook?.author}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 도트 인디케이터 */}
              {books.length > 1 && (
                <div className="flex gap-1.5">
                  {books.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { dragX.set(0); setActiveBookIdx(i); }}
                      className={`rounded-full transition-all cursor-pointer ${i === activeBookIdx ? "w-4 h-1.5 bg-[#8B3A2A]" : "w-1.5 h-1.5 bg-[#D4C5B0] hover:bg-[#B8A898]"}`}
                      aria-label={`책 ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {books.length > 1 && (
                <p className="text-[10px] text-neutral-400 tracking-wide">← 드래그하여 다음 책 →</p>
              )}
            </motion.div>
          );
        })()}
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
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1A17] text-white text-xs font-semibold rounded-full hover:bg-[#8B3A2A] transition-colors flex-shrink-0 cursor-pointer"
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
            <motion.div
              variants={reviewVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {reviews.map((r) => (
                <motion.div key={r.id} variants={reviewItem}>
                  <Link href={`/reviews/${r.id}`} className="block group cursor-pointer">
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
                </motion.div>
              ))}
            </motion.div>
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
              <motion.div
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                initial="hidden"
                animate="show"
                className="space-y-2.5"
              >
                {attendees.map((a) => (
                  <motion.div
                    key={a.id}
                    variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8956C] flex-shrink-0" />
                    <span className="text-sm text-[#1C1A17]">{a.name}</span>
                  </motion.div>
                ))}
              </motion.div>
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
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 sm:inset-0 z-50 flex sm:items-center sm:justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl p-6 z-10 pointer-events-auto"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
              >
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
                            <motion.button
                              key={m.id}
                              type="button"
                              disabled={alreadyIn}
                              whileHover={alreadyIn ? {} : { scale: 1.04 }}
                              whileTap={alreadyIn ? {} : { scale: 0.96 }}
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
                            </motion.button>
                          );
                        })}
                      </div>

                      {allAdded && (
                        <p className="text-xs text-neutral-400 text-center">모든 멤버가 이미 참석자로 등록되어 있습니다.</p>
                      )}

                      <Button
                        onClick={confirmAdd}
                        disabled={selected.size === 0 || adding}
                        className="w-full bg-[#1C1A17] hover:bg-[#8B3A2A] transition-colors cursor-pointer rounded-full"
                      >
                        {adding ? "추가 중..." : `${selected.size > 0 ? `${selected.size}명 ` : ""}참석자 추가`}
                      </Button>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
