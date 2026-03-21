"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, BookOpen, MapPin } from "lucide-react";
import Link from "next/link";
import MeetingsCalendar from "@/components/meetings-calendar";

type BookBasic = { title: string; author: string; cover_url: string | null };
type Meeting = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  books: BookBasic | null;
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

  const nextMeeting = upcoming[0] ?? null;
  const initialMonth = nextMeeting ? new Date(nextMeeting.date + "T00:00:00") : undefined;
  const displayMeeting: Meeting | null =
    selectedId != null
      ? ([...upcoming, ...past].find((m) => m.id === selectedId) ?? null)
      : nextMeeting;
  const displayBook = displayMeeting?.books ?? null;
  const isSelectedPast = selectedId != null && displayMeeting != null && displayMeeting.date < today;

  function handleMeetingClick(id: number, date: string) {
    if (date >= today) {
      router.push(`/meetings/${id}`);
    } else {
      setSelectedId((prev) => (prev === id ? null : id));
    }
  }

  return (
    <div className="px-4 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-start">
      {/* Left: calendar + past meetings */}
      <div className="space-y-12">
        <MeetingsCalendar
          meetings={meetings}
          onMeetingClick={handleMeetingClick}
          initialMonth={initialMonth}
        />

        {/* Past meetings */}
        <div>
          <h2 className="text-2xl font-bold text-[#1C1A17] mb-6">지난 모임</h2>
          {past.length > 0 ? (
            <div className="divide-y divide-[#E8E0D8]">
              {past.map((m) => {
                const book = m.books;
                const isSelected = selectedId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMeetingClick(m.id, m.date)}
                    className={`w-full text-left flex gap-4 py-5 group cursor-pointer transition-colors ${isSelected ? "opacity-100" : ""}`}
                  >
                    <div className="w-12 h-[68px] flex-shrink-0 rounded-md overflow-hidden bg-[#E8DDD0] shadow-sm">
                      {book?.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
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
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">지난 모임이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Right: meeting card */}
      <div className="sticky top-20">
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

        {displayMeeting ? (
          <div className="bg-white rounded-2xl overflow-hidden border border-[#E8DDD0] shadow-sm">
            {/* Book cover */}
            <div className="bg-[#F5F0E8] flex items-center justify-center py-8 px-6 min-h-[220px]">
              {displayBook?.cover_url ? (
                <img
                  src={displayBook.cover_url}
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
                  {isSelectedPast ? "Past Meeting" : "Next Meeting"}
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
                  <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-1">DATE</p>
                  <p className="text-[#1C1A17] font-semibold leading-snug">
                    {format(new Date(displayMeeting.date), "M월 d일, EEEE", { locale: ko })}
                  </p>
                </div>
                {displayMeeting.location && (
                  <div>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-1">LOCATION</p>
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
                  className="block w-full py-2.5 bg-[#1C1A17] text-white text-[11px] font-bold tracking-[0.15em] uppercase text-center rounded-lg hover:bg-[#8B3A2A] transition-colors cursor-pointer"
                >
                  상세 내용 보기 →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DDD0] p-6 text-center">
            <p className="text-sm text-neutral-400">예정된 모임이 없습니다.</p>
          </div>
        )}

        {/* Other upcoming meetings */}
        {upcoming.length > 1 && selectedId == null && (
          <div className="mt-4 space-y-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
