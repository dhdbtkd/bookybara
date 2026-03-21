import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, BookOpen, MapPin } from "lucide-react";
import Link from "next/link";
import MeetingsCalendar from "@/components/meetings-calendar";

export const dynamic = "force-dynamic";

type BookBasic = { title: string; author: string; cover_url: string | null };

export default async function MeetingsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, books(title, author, cover_url)")
    .order("date", { ascending: false });

  const upcoming = [...(meetings?.filter((m) => m.date >= today) ?? [])].reverse();
  const past = meetings?.filter((m) => m.date < today) ?? [];
  const nextMeeting = upcoming[0] ?? null;
  const nextBook = nextMeeting?.books as BookBasic | null;

  return (
    <div className="-mx-4 -mt-8">
      {/* ── Page header ── */}
      <div className="px-8 pt-12 pb-8 border-b border-[#DDD5C8]">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#8B3A2A] mb-3">
          독서 모임 스케줄
        </p>
        <h1
          className="text-[2.8rem] leading-tight text-[#1C1A17]"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
        >
          모임 일정
        </h1>
        <p className="text-sm text-[#6B5E52] mt-3 max-w-md leading-relaxed">
          우리의 문학적 여정을 함께 계획하세요. 매월 선정된 도서와 깊이 있는 토론의 시간을 기록합니다.
        </p>
      </div>

      {/* ── Body ── */}
      <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-[1fr_288px] gap-10 items-start">

        {/* Left: calendar + past meetings */}
        <div className="space-y-12">
          <MeetingsCalendar
            meetings={(meetings ?? []).map((m) => ({ id: m.id, date: m.date, title: m.title }))}
          />

          {/* Past meetings */}
          <div>
            <h2
              className="text-2xl text-[#1C1A17] mb-6"
              style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
            >
              지난 모임
            </h2>
            {past.length > 0 ? (
              <div className="divide-y divide-[#E8E0D8]">
                {past.map((m) => {
                  const book = m.books as BookBasic | null;
                  return (
                    <Link
                      key={m.id}
                      href={`/meetings/${m.id}`}
                      className="flex gap-4 py-5 group cursor-pointer"
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
                        <h3 className="font-semibold text-sm text-[#1C1A17] group-hover:text-[#8B3A2A] transition-colors mb-0.5">
                          {m.title}
                        </h3>
                        {book && (
                          <p className="text-xs text-neutral-400">
                            {book.title} · {book.author}
                          </p>
                        )}
                        <p className="text-xs text-[#8B3A2A] mt-2 group-hover:underline underline-offset-2">
                          토론 요약 보기
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">지난 모임이 없습니다.</p>
            )}
          </div>
        </div>

        {/* Right: upcoming meeting card (sticky) */}
        <div className="sticky top-20">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-[#1C1A17] mb-4">
            예정된 모임
          </h2>

          {nextMeeting ? (
            <div className="bg-white rounded-2xl overflow-hidden border border-[#E8DDD0] shadow-sm">
              {/* Book cover area */}
              <div className="bg-[#F5F0E8] flex items-center justify-center py-8 px-6 min-h-[220px]">
                {nextBook?.cover_url ? (
                  <img
                    src={nextBook.cover_url}
                    alt={nextBook.title}
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
                    Next Meeting
                  </p>
                  <h3
                    className="text-[1.4rem] leading-tight text-[#1C1A17]"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {nextBook?.title ?? nextMeeting.title}
                  </h3>
                  {nextBook?.author && (
                    <p className="text-sm text-neutral-400 mt-0.5">{nextBook.author}</p>
                  )}
                </div>

                <div className="h-px bg-[#EDE6DA]" />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-1">DATE</p>
                    <p className="text-[#1C1A17] font-semibold leading-snug">
                      {format(new Date(nextMeeting.date), "M월 d일, EEEE", { locale: ko })}
                    </p>
                  </div>
                  {nextMeeting.location && (
                    <div>
                      <p className="text-[9px] font-bold tracking-widest uppercase text-neutral-400 mb-1">LOCATION</p>
                      <p className="text-[#1C1A17] font-semibold leading-snug flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-neutral-400" />
                        {nextMeeting.location}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <Link
                    href={`/meetings/${nextMeeting.id}`}
                    className="block w-full py-2.5 bg-[#8B3A2A] text-white text-[11px] font-bold tracking-[0.15em] uppercase text-center rounded-lg hover:bg-[#6B2A1A] transition-colors cursor-pointer"
                  >
                    참석 신청하기 →
                  </Link>
                  <Link
                    href={`/meetings/${nextMeeting.id}`}
                    className="block w-full py-2 text-xs text-neutral-400 text-center hover:text-[#8B3A2A] transition-colors cursor-pointer"
                  >
                    상세 내용 확인
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
          {upcoming.length > 1 && (
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
    </div>
  );
}
