import { createClient } from "@/utils/supabase/server";
import { format, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, FileText, BookOpen, ArrowRight, ThumbsUp } from "lucide-react";
import Link from "next/link";
import BookCover3D from "@/components/book-cover-3d";

export const dynamic = "force-dynamic";

type CategoryInfo = { name: string; color: string };
type BookInfo = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  book_categories: CategoryInfo | CategoryInfo[] | null;
};

function getDday(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = differenceInCalendarDays(target, today);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: nextMeeting } = await supabase
    .from("meetings")
    .select("id, title, date, location, book_id, books(id, title, author, cover_url, description, category_id, book_categories(name, color))")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .single();

  const [{ count: attendeeCount }, { count: reviewCount }, { data: announcements }, { data: allBooks }, { data: pendingCandidates }] =
    await Promise.all([
      nextMeeting
        ? supabase.from("attendees").select("*", { count: "exact", head: true }).eq("meeting_id", nextMeeting.id)
        : Promise.resolve({ count: 0 }),
      nextMeeting
        ? supabase.from("reviews").select("*", { count: "exact", head: true }).eq("meeting_id", nextMeeting.id)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("books")
        .select("id, title, author, cover_url, meetings(id, date)")
        .order("created_at", { ascending: false }),
      supabase
        .from("book_candidates")
        .select("id, title, author, cover_url, proposed_by")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  // 완독된 책 (과거 모임만 있는 책)
  const readBooks = (allBooks ?? [])
    .map((b) => ({ ...b, meetings: (Array.isArray(b.meetings) ? b.meetings : b.meetings ? [b.meetings] : []) as { id: number; date: string }[] }))
    .filter((b) => b.meetings.length > 0 && b.meetings.every((m) => m.date < today))
    .sort((a, b) => {
      const aMax = Math.max(...a.meetings.map((m) => new Date(m.date).getTime()));
      const bMax = Math.max(...b.meetings.map((m) => new Date(m.date).getTime()));
      return bMax - aMax;
    });

  const book = nextMeeting?.books as BookInfo | BookInfo[] | null;
  const bookInfo = Array.isArray(book) ? (book[0] ?? null) : book;
  const rawCat = bookInfo?.book_categories;
  const category = rawCat ? (Array.isArray(rawCat) ? rawCat[0] ?? null : rawCat) : null;
  const dday = nextMeeting ? getDday(nextMeeting.date) : null;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="-mx-4 -mt-8 bg-[#F0EAE0]">
        <div className="px-4 sm:px-8 py-12 md:py-18">
          {nextMeeting ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">

              {/* Left: text */}
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#8B3A2A] mb-5">
                    이번 선정 도서
                  </p>
                  {bookInfo ? (
                    <>
                      <h1
                        className="leading-[1.12] text-[#1C1A17] mb-3"
                        style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
                      >
                        {bookInfo.title}
                      </h1>
                      <p
                        className="text-[#8B3A2A]"
                        style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontSize: "1.1rem" }}
                      >
                        {bookInfo.author}
                      </p>
                    </>
                  ) : (
                    <h1
                      className="text-[#1C1A17]"
                      style={{ fontFamily: "var(--font-playfair)", fontSize: "2.5rem" }}
                    >
                      {nextMeeting.title}
                    </h1>
                  )}
                  {category && (
                    <span
                      className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: category.color + "22", color: category.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </span>
                  )}
                </div>

                {bookInfo?.description && (
                  <p className="text-sm text-[#6B5E52] leading-relaxed max-w-xs line-clamp-4">
                    {bookInfo.description}
                  </p>
                )}

                <div className="flex items-center gap-5 flex-wrap">
                  <Link
                    href={`/reviews/new?meetingId=${nextMeeting.id}`}
                    className="px-6 py-2.5 bg-[#1C1A17] text-white text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#8B3A2A] transition-colors cursor-pointer"
                  >
                    독후감 쓰기
                  </Link>
                  <Link
                    href={`/meetings/${nextMeeting.id}`}
                    className="text-sm text-[#8B3A2A] hover:underline cursor-pointer underline-offset-4"
                  >
                    모임 상세 보기 →
                  </Link>
                </div>
              </div>

              {/* Right: 3D book + meeting card */}
              <div className="relative flex justify-center md:justify-end">
                <BookCover3D
                  coverUrl={bookInfo?.cover_url ?? null}
                  title={bookInfo?.title ?? nextMeeting.title}
                />

                {/* Meeting card */}
                <div className="absolute bottom-4 left-0 md:-left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/60 p-4 w-54 z-30">
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">
                    다음 모임
                  </p>
                  <p className="font-semibold text-[#1C1A17] text-base">
                    {format(new Date(nextMeeting.date), "M월 d일 (EEE)", { locale: ko })}
                  </p>
                  {nextMeeting.location && (
                    <p className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {nextMeeting.location}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-neutral-100">
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Users className="w-3 h-3" />
                      {attendeeCount ?? 0}명
                    </span>
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <FileText className="w-3 h-3" />
                      독후감 {reviewCount ?? 0}개
                    </span>
                    {dday && (
                      <span className="ml-auto text-xs font-bold text-[#8B3A2A]">{dday}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p
                className="text-[#1C1A17] mb-4"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "2rem" }}
              >
                다가오는 모임이 없습니다
              </p>
              <Link href="/meetings" className="text-sm text-[#8B3A2A] hover:underline cursor-pointer">
                모든 일정 보기 →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 공지사항 ── */}
      {announcements && announcements.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            공지사항
          </h2>
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && <Badge variant="secondary" className="text-xs">고정</Badge>}
                        <span className="font-medium text-sm">{a.title}</span>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1 whitespace-pre-wrap">{a.content}</p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 pt-0.5">
                      {format(new Date(a.created_at), "M/d", { locale: ko })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── 지금까지 읽은 책 ── */}
      <section className="-mx-4 mt-16 bg-[#F7F4F0] py-12 px-4 sm:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#8B3A2A] mb-2">우리 서재</p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }} className="text-[#1C1A17] font-normal">
              읽은 책 <span className="text-neutral-400 text-2xl">목록</span>
            </h2>
          </div>
          <Link href="/candidates" className="text-xs text-neutral-500 hover:text-[#1C1A17] transition-colors tracking-wide">
            전체 보기 →
          </Link>
        </div>
        {readBooks.length > 0 ? (
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {readBooks.map((book) => (
              <div key={book.id} className="flex-shrink-0 w-[170px] sm:w-[200px]">
                <div className="relative aspect-[2/3] overflow-hidden bg-[#E8DDD0] shadow-lg mb-3">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#B8A898]" />
                    </div>
                  )}
                </div>
                <p className="text-[15px] font-semibold text-[#1C1A17] leading-snug line-clamp-2 mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  {book.title}
                </p>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 truncate">{book.author}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 py-6">아직 읽은 책이 없어요.</p>
        )}
      </section>

      {/* ── 후보 도서 ── */}
      <section className="-mx-4 mt-0 bg-[#FAFAF8] py-12 px-4 sm:px-8 pb-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#8B3A2A] mb-2">다음 도서 선정</p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }} className="text-[#1C1A17] font-normal">
              후보 도서
            </h2>
          </div>
          <Link href="/candidates?tab=candidates" className="text-xs text-neutral-500 hover:text-[#1C1A17] transition-colors tracking-wide">
            도서 제안하기 →
          </Link>
        </div>
        {(pendingCandidates ?? []).length > 0 ? (
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {(pendingCandidates ?? []).map((c) => (
              <div key={c.id} className="flex-shrink-0 w-[170px] sm:w-[200px]">
                <div className="relative aspect-[2/3] overflow-hidden bg-[#E8DDD0] shadow-lg mb-3">
                  {c.cover_url ? (
                    <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#B8A898]" />
                    </div>
                  )}
                </div>
                <p className="text-[15px] font-semibold text-[#1C1A17] leading-snug line-clamp-2 mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  {c.title}
                </p>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 truncate mb-3">{c.author}</p>
                <Link
                  href="/candidates?tab=candidates"
                  className="flex items-center justify-center gap-1.5 w-full py-2 border border-neutral-200 text-[11px] font-semibold tracking-[0.12em] uppercase text-neutral-500 hover:border-[#1C1A17] hover:text-[#1C1A17] transition-colors"
                >
                  <ThumbsUp className="w-3 h-3" />
                  투표
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 py-6">아직 후보가 없어요.</p>
        )}
      </section>
    </div>
  );
}
