"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, MapPin, ChevronRight, BookOpen, MessageCircle } from "lucide-react";

type Book = { id: number; title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
type Meeting = { id: number; title: string; date: string; location: string | null; books: Book[] };
type Question = { id: number; meeting_id: number | null; book_id: number; questions: string; books: { title: string; author: string } | null };

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

export default function DiscussionClient({ meetings, questions }: { meetings: Meeting[]; questions: Question[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMeetingId = searchParams.get("meeting") ? Number(searchParams.get("meeting")) : null;

  // group questions by meeting_id
  const questionsByMeeting = useMemo(() => {
    const map = new Map<number, Question[]>();
    for (const q of questions) {
      if (q.meeting_id != null) {
        if (!map.has(q.meeting_id)) map.set(q.meeting_id, []);
        map.get(q.meeting_id)!.push(q);
      }
    }
    return map;
  }, [questions]);

  const sortedMeetings = useMemo(
    () => meetings.filter((m) => questionsByMeeting.has(m.id)).sort((a, b) => b.date.localeCompare(a.date)),
    [meetings, questionsByMeeting]
  );

  function selectMeeting(id: number) {
    router.push(`?meeting=${id}`);
  }

  function goBack() {
    router.push("?");
  }

  // ── 모임 상세 뷰 ──
  if (selectedMeetingId !== null) {
    const meeting = meetings.find((m) => m.id === selectedMeetingId);
    if (!meeting) return null;
    const meetingQuestions = questionsByMeeting.get(selectedMeetingId) ?? [];

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* 뒤로가기 */}
        <button
          onClick={goBack}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C1A17] text-[#F0EAE0] text-[11px] font-bold tracking-[0.12em] uppercase mb-6 hover:bg-[#8B3A2A] transition-colors duration-200 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform duration-200">←</span> 모임 목록
        </button>

        {/* 모임 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="flex items-center gap-1 text-[10px] text-[#9C8E7E] tracking-wider">
              <CalendarDays size={11} />
              {format(new Date(meeting.date), "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1 text-[10px] text-[#9C8E7E] tracking-wider">
                <MapPin size={11} />
                {meeting.location}
              </span>
            )}
          </div>
          <h2 className="text-3xl text-[#1C1A17] leading-tight">{meeting.title}</h2>
        </div>

        {/* 도서별 질문 목록 */}
        <div className="space-y-10">
          {meetingQuestions.map((q) => {
            const qList: string[] = JSON.parse(q.questions);
            const book = meeting.books.find((b) => b.id === q.book_id) ?? null;
            const cover = book?.cover_url_hires || book?.cover_url;

            return (
              <section key={q.id}>
                {/* 도서 헤더 */}
                {book && (
                  <div className="flex items-start gap-4 mb-5 pb-4 border-b border-[#D4C5B0]/60">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={book.title} className="w-12 h-[68px] object-cover rounded-xl shadow-md flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-[68px] bg-[#D4C5B0] rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-[#9C8E7E]" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-[#9C8E7E] mb-1">도서</p>
                      <h3 className="text-lg font-semibold text-[#1C1A17] leading-snug">{book.title}</h3>
                      <p className="text-xs text-[#9C8E7E] mt-0.5">{book.author}</p>
                    </div>
                  </div>
                )}

                {/* 질문 리스트 */}
                <motion.ol
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {qList.map((question, i) => (
                    <motion.li key={i} variants={itemVariants}>
                      <div className="flex gap-3 px-4 py-3.5 rounded-2xl bg-white border border-[#D4C5B0]/50">
                        <span className="text-sm font-bold text-[#C8956C] flex-shrink-0 w-5">{i + 1}.</span>
                        <p className="text-sm text-[#2C2520] leading-relaxed">{question}</p>
                      </div>
                    </motion.li>
                  ))}
                </motion.ol>
              </section>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ── 모임 목록 뷰 ──
  if (sortedMeetings.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-[#9C8E7E]">
        공개된 토론 질문이 없습니다. 모임 전날 운영자가 생성합니다.
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2.5">
      {sortedMeetings.map((meeting, i) => {
        const meetingQuestions = questionsByMeeting.get(meeting.id) ?? [];
        const questionCount = meetingQuestions.reduce((acc, q) => acc + (JSON.parse(q.questions) as string[]).length, 0);
        const covers = meeting.books.map((b) => b.cover_url_hires || b.cover_url).filter(Boolean) as string[];
        const isLatest = i === 0;

        return (
          <motion.button
            key={meeting.id}
            variants={itemVariants}
            whileHover={{ x: 3 }}
            transition={{ duration: 0.18 }}
            onClick={() => selectMeeting(meeting.id)}
            className="w-full text-left group cursor-pointer"
          >
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-[#D4C5B0]/50 bg-white/40 hover:bg-white/70 hover:border-[#C8956C]/50 hover:shadow-md transition-all duration-200">
              {/* 커버 스택 — 고정 너비 68px */}
              <div className="relative flex-shrink-0" style={{ width: 68, height: 64 }}>
                {covers.length === 0 ? (
                  <div className="absolute inset-0 w-11 h-full bg-[#D4C5B0] rounded-lg shadow-sm flex items-center justify-center">
                    <BookOpen size={13} className="text-[#9C8E7E]" />
                  </div>
                ) : covers.length === 1 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={covers[0]}
                    alt=""
                    className="absolute object-cover rounded-lg shadow-sm"
                    style={{ width: 44, height: 64, left: 12, top: 0, zIndex: 1 }}
                  />
                ) : (
                  covers.slice(0, 2).map((cover, ci) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={ci}
                      src={cover}
                      alt=""
                      className="absolute object-cover rounded-lg shadow-sm"
                      style={{ width: 44, height: 64, left: ci === 0 ? 0 : 24, top: ci === 0 ? 0 : -4, zIndex: 2 - ci }}
                    />
                  ))
                )}
              </div>

              {/* 모임 정보 */}
              <div className="flex-1 min-w-0">
                {meeting.books.length > 0 && (
                  <h3 className="text-sm font-semibold text-[#1C1A17] leading-snug group-hover:text-[#8B3A2A] transition-colors duration-200 truncate mb-0.5">
                    {meeting.books.map((b) => b.title).join(" · ")}
                  </h3>
                )}
                <p className="text-[11px] text-[#9C8E7E] truncate mb-1.5">{meeting.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {isLatest && (
                    <span className="text-[9px] font-bold tracking-widest bg-[#C8956C]/15 text-[#C8956C] px-2 py-0.5 rounded-full uppercase">
                      최신
                    </span>
                  )}
                  <span className="text-[10px] text-[#9C8E7E] tracking-wide flex items-center gap-1">
                    <CalendarDays size={9} />
                    {format(new Date(meeting.date), "yyyy. MM. dd", { locale: ko })}
                  </span>
                  {meeting.location && (
                    <span className="text-[10px] text-[#9C8E7E]/60 flex items-center gap-1">
                      <MapPin size={9} />
                      {meeting.location}
                    </span>
                  )}
                </div>
              </div>

              {/* 질문 수 */}
              <div className="flex-shrink-0 text-right pr-1">
                <p className="text-2xl text-[#1C1A17] leading-none">{questionCount}</p>
                <p className="text-[9px] tracking-widest uppercase text-[#9C8E7E] mt-0.5 flex items-center gap-0.5 justify-end">
                  <MessageCircle size={8} />질문
                </p>
              </div>

              <ChevronRight
                size={14}
                className="flex-shrink-0 text-[#9C8E7E] group-hover:translate-x-0.5 group-hover:text-[#8B3A2A] transition-all duration-200"
              />
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
