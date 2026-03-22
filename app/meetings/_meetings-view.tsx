"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, BookOpen, MapPin } from "lucide-react";
import Link from "next/link";
import MeetingsCalendar from "@/components/meetings-calendar";
import { motion, AnimatePresence } from "motion/react";

type BookBasic = { title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
type Meeting = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  books: BookBasic[];
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35 } },
};

export default function MeetingsView({
  meetings,
  upcoming,
  past,
}: {
  meetings: { id: number; date: string; title: string }[];
  upcoming: Meeting[];
  past: Meeting[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focusMonth, setFocusMonth] = useState<Date | undefined>(undefined);

  const nextMeeting = upcoming[0] ?? null;
  const initialMonth = nextMeeting ? new Date(nextMeeting.date + "T00:00:00") : undefined;
  const displayMeeting: Meeting | null =
    selectedId != null
      ? ([...upcoming, ...past].find((m) => m.id === selectedId) ?? null)
      : nextMeeting;
  const displayBook = displayMeeting?.books?.[0] ?? null;
  const isSelectedPast = selectedId != null && displayMeeting != null && displayMeeting.date < today;

  function handleMeetingClick(id: number, date: string) {
    if (date >= today) {
      router.push(`/meetings/${id}`);
    } else {
      setSelectedId((prev) => (prev === id ? null : id));
      setFocusMonth(new Date(date + "T00:00:00"));
    }
  }

  return (
    <div className="px-4 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-start">
      {/* Left: calendar + past meetings */}
      <div className="space-y-12 order-2 md:order-1">
        <MeetingsCalendar
          meetings={meetings}
          onMeetingClick={handleMeetingClick}
          initialMonth={initialMonth}
          focusMonth={focusMonth}
        />

        {/* Past meetings */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="text-2xl font-bold text-[#1C1A17] mb-6"
          >
            지난 모임
          </motion.h2>
          {past.length > 0 ? (
            <motion.div
              variants={listVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              className="divide-y divide-[#E8E0D8]"
            >
              {past.map((m) => {
                const book = m.books[0] ?? null;
                const isSelected = selectedId === m.id;
                return (
                  <motion.button
                    key={m.id}
                    variants={rowVariants}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.18 }}
                    type="button"
                    onClick={() => handleMeetingClick(m.id, m.date)}
                    className={`w-full text-left flex gap-4 py-5 group cursor-pointer transition-colors ${isSelected ? "opacity-100" : ""}`}
                  >
                    <div className="w-12 h-[68px] flex-shrink-0 rounded-xl overflow-hidden bg-[#E8DDD0] shadow-sm">
                      {book?.cover_url_hires ?? book?.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.cover_url_hires ?? book.cover_url!} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-[#B8A898]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#8B7B6B] mb-1">
                        {format(new Date(m.date), "yyyy년 M월 d일", { locale: ko })}
                      </p>
                      <h3 className={`font-semibold text-sm transition-colors mb-0.5 ${isSelected ? "text-[#8B3A2A]" : "text-[#1C1A17] group-hover:text-[#8B3A2A]"}`}>
                        {m.title}
                      </h3>
                      {book && (
                        <p className="text-xs text-neutral-400">
                          {book.title} · {book.author}
                        </p>
                      )}
                      <p className={`text-xs mt-2 underline-offset-2 ${isSelected ? "text-[#8B3A2A] underline" : "text-[#8B3A2A] group-hover:underline"}`}>
                        {isSelected ? "선택됨" : "토론 요약 보기"}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <p className="text-sm text-neutral-400">지난 모임이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Right: meeting card */}
      <div className="sticky top-20 order-1 md:order-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-[#1C1A17]">
            {isSelectedPast ? "지난 모임" : "예정된 모임"}
          </h2>
          {selectedId != null && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-[10px] text-neutral-400 hover:text-neutral-600 underline underline-offset-2 cursor-pointer"
            >
              초기화
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {displayMeeting ? (
            <motion.div
              key={displayMeeting.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white rounded-2xl overflow-hidden border border-[#E8DDD0] shadow-sm"
            >
              {/* Book cover */}
              <div className="bg-[#F5F0E8] flex items-center justify-center py-8 px-6 min-h-[220px]">
                {displayBook?.cover_url_hires ?? displayBook?.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayBook.cover_url_hires ?? displayBook.cover_url!}
                    alt={displayBook.title}
                    className="max-h-44 object-contain"
                    style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))" }}
                  />
                ) : (
                  <div className="w-28 h-40 bg-[#E8DDD0] rounded-lg flex items-center justify-center shadow-inner">
                    <BookOpen className="w-8 h-8 text-[#B8A898]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#8B3A2A] flex items-center gap-1.5 mb-2">
                    <CalendarDays className="w-3 h-3" />
                    {isSelectedPast ? "지난 모임" : "다음 모임"}
                  </p>
                  <h3 className="text-[1.4rem] leading-tight text-[#1C1A17] font-bold">
                    {displayBook?.title ?? displayMeeting.title}
                  </h3>
                  {displayBook?.author && (
                    <p className="text-sm text-neutral-400 mt-0.5">{displayBook.author}</p>
                  )}
                </div>

                <div className="h-px bg-[#EDE6DA]" />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-1">날짜</p>
                    <p className="text-[#1C1A17] font-semibold leading-snug">
                      {format(new Date(displayMeeting.date), "M월 d일, EEEE", { locale: ko })}
                    </p>
                  </div>
                  {displayMeeting.location && (
                    <div>
                      <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-1">장소</p>
                      <p className="text-[#1C1A17] font-semibold leading-snug flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-neutral-400" />
                        {displayMeeting.location}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <Link
                    href={`/meetings/${displayMeeting.id}`}
                    className="block w-full py-2.5 bg-[#1C1A17] text-white text-[11px] font-bold tracking-[0.15em] uppercase text-center rounded-full hover:bg-[#8B3A2A] transition-colors cursor-pointer"
                  >
                    상세 내용 보기 →
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-[#E8DDD0] p-6 text-center"
            >
              <p className="text-sm text-neutral-400">예정된 모임이 없습니다.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Other upcoming meetings */}
        {upcoming.length > 1 && selectedId == null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 space-y-2"
          >
            {upcoming.slice(1).map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-[#E8DDD0] hover:bg-white transition-colors cursor-pointer"
              >
                <CalendarDays className="w-4 h-4 text-[#8B3A2A] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#1C1A17] truncate">{m.title}</p>
                  <p className="text-[10px] text-neutral-400">
                    {format(new Date(m.date), "M월 d일 (EEE)", { locale: ko })}
                  </p>
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
