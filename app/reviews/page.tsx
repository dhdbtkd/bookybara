"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BookOpen, BookMarked, Users, PenLine, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Review = {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  book_id: number;
  meeting_id: number | null;
  books: { title: string; author: string; cover_url: string | null; cover_url_hires: string | null } | null;
  meetings: { title: string; date: string; location: string | null } | null;
};

type Book = {
  id: number;
  title: string;
  author: string;
  cover_url?: string | null;
  cover_url_hires?: string | null;
};

type MeetingBook = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  cover_url_hires: string | null;
};

type MeetingData = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  books: MeetingBook[];
};

type ViewMode = "gathering" | "book" | "member";

const NAV_ITEMS: { mode: ViewMode; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { mode: "gathering", label: "모임 별", sublabel: "BY GATHERING", icon: <BookOpen size={14} /> },
  { mode: "book", label: "도서 별", sublabel: "BY BOOK", icon: <BookMarked size={14} /> },
  { mode: "member", label: "참석자 별", sublabel: "BY MEMBER", icon: <Users size={14} /> },
];

const VIEW_TITLES: Record<ViewMode, { title: string; subtitle: string }> = {
  gathering: { title: "모임별 독후감", subtitle: "모임을 선택하면 해당 모임의 독후감을 볼 수 있습니다." },
  book: { title: "도서별 독후감", subtitle: "도서별로 모아 읽는 우리들의 시선." },
  member: { title: "참석자별 독후감", subtitle: "참석자가 남긴 독서의 흔적들." },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// ── Review Card ──────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
      <Link href={`/reviews/${review.id}`} className="block group cursor-pointer">
        <div className="border-b border-[#D4C5B0]/60 py-5 hover:bg-[#EAE0D0]/50 -mx-4 px-4 transition-colors duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1C1A17] text-[#F0EAE0] text-[10px] font-bold tracking-wide flex-shrink-0 group-hover:bg-[#8B3A2A] transition-colors duration-200">
                {initials(review.author_name)}
              </span>
              <p className="text-xs font-semibold tracking-widest text-[#1C1A17] uppercase leading-none">
                {review.author_name}
              </p>
            </div>
            <span className="text-[11px] text-[#9C8E7E] flex-shrink-0 pt-1">
              {format(new Date(review.created_at), "yy.MM.dd", { locale: ko })}
            </span>
          </div>
          <p className="text-sm text-[#3D3530] leading-relaxed line-clamp-2 mt-1 group-hover:text-[#1C1A17] transition-colors duration-200">
            {review.content}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#9C8E7E] mt-2 group-hover:text-[#8B3A2A] transition-colors duration-200">
            전문 읽기 <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

// ── BY GATHERING ─────────────────────────────────────────────────
function GatheringView({ reviews, meetings }: { reviews: Review[]; meetings: MeetingData[] }) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [activeBookId, setActiveBookId] = useState<number | null>(null); // null = all

  const reviewsByMeeting = useMemo(() => {
    const map = new Map<number, Review[]>();
    for (const r of reviews) {
      if (r.meeting_id != null) {
        if (!map.has(r.meeting_id)) map.set(r.meeting_id, []);
        map.get(r.meeting_id)!.push(r);
      }
    }
    return map;
  }, [reviews]);

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => b.date.localeCompare(a.date)),
    [meetings]
  );

  const unassigned = useMemo(() => reviews.filter((r) => r.meeting_id == null), [reviews]);

  // ── 모임 상세 뷰 ──────────────────────────────────────────────
  if (selectedMeetingId !== null) {
    const meeting = meetings.find((m) => m.id === selectedMeetingId);
    if (!meeting) return null;

    const meetingReviews = reviewsByMeeting.get(selectedMeetingId) ?? [];
    const books = meeting.books;
    const hasMultipleBooks = books.length > 1;

    // reviews grouped by book_id
    const byBook = new Map<number, Review[]>();
    for (const r of meetingReviews) {
      if (!byBook.has(r.book_id)) byBook.set(r.book_id, []);
      byBook.get(r.book_id)!.push(r);
    }

    // books to display based on active tab
    const displayBooks = activeBookId == null ? books : books.filter((b) => b.id === activeBookId);

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* 뒤로가기 */}
        <button
          onClick={() => { setSelectedMeetingId(null); setActiveBookId(null); }}
          className="cursor-pointer text-xs text-[#9C8E7E] hover:text-[#1C1A17] tracking-wider uppercase mb-6 flex items-center gap-1.5 transition-colors duration-200 group"
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
            <span className="text-[10px] text-[#9C8E7E]/60">{meetingReviews.length}개의 독후감</span>
          </div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl italic text-[#1C1A17] leading-tight">
            {meeting.title}
          </h2>
        </div>

        {/* 도서 탭 (여러 권인 경우만) */}
        {hasMultipleBooks && (
          <div className="flex border-b border-[#D4C5B0] mb-8 overflow-x-auto gap-0">
            <button
              onClick={() => setActiveBookId(null)}
              className={`flex-shrink-0 px-4 py-3 text-left border-b-2 transition-all duration-200 cursor-pointer ${
                activeBookId == null
                  ? "border-b-[#8B3A2A] text-[#1C1A17]"
                  : "border-b-transparent text-[#9C8E7E] hover:text-[#1C1A17]"
              }`}
            >
              <p className="text-[9px] tracking-[0.15em] uppercase text-[#9C8E7E]/60 mb-0.5">전체</p>
              <p className="text-xs font-semibold">모든 도서</p>
            </button>
            {books.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setActiveBookId(b.id)}
                className={`flex-shrink-0 px-4 py-3 text-left border-b-2 transition-all duration-200 cursor-pointer ${
                  activeBookId === b.id
                    ? "border-b-[#8B3A2A] text-[#1C1A17]"
                    : "border-b-transparent text-[#9C8E7E] hover:text-[#1C1A17]"
                }`}
              >
                <p className="text-[9px] tracking-[0.15em] uppercase text-[#9C8E7E]/60 mb-0.5">
                  {i === 0 ? "주 도서" : `도서 ${i + 1}`}
                </p>
                <p className="text-xs font-semibold truncate max-w-[140px]">{b.title}</p>
              </button>
            ))}
          </div>
        )}

        {/* 도서별 독후감 섹션 */}
        <div className="space-y-12">
          {displayBooks.map((book) => {
            const bookReviews = byBook.get(book.id) ?? [];
            const cover = book.cover_url_hires || book.cover_url;
            return (
              <section key={book.id}>
                {/* 도서 섹션 헤더 */}
                <div className="flex items-start gap-4 mb-6 pb-5 border-b border-[#D4C5B0]/60">
                  <div className="flex-shrink-0">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={book.title}
                        className="w-14 h-20 object-cover rounded-xl shadow-md"
                      />
                    ) : (
                      <div className="w-14 h-20 bg-[#D4C5B0] rounded-xl shadow-md flex items-center justify-center">
                        <BookOpen size={14} className="text-[#9C8E7E]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#9C8E7E] mb-1">도서</p>
                    <h3 className="font-[family-name:var(--font-playfair)] text-xl italic text-[#1C1A17] leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-xs text-[#9C8E7E] mt-0.5">{book.author}</p>
                    <p className="text-[11px] text-[#9C8E7E]/50 mt-1">{bookReviews.length}개 독후감</p>
                  </div>
                </div>

                {bookReviews.length === 0 ? (
                  <p className="text-sm text-[#9C8E7E] italic text-center py-6">이 도서에 대한 독후감이 없습니다.</p>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 gap-x-8"
                  >
                    {bookReviews.map((r) => (
                      <motion.div key={r.id} variants={itemVariants}>
                        <ReviewCard review={r} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ── 모임 목록 뷰 ─────────────────────────────────────────────
  if (sortedMeetings.length === 0 && unassigned.length === 0) return <EmptyState />;

  const today = new Date().toISOString().split("T")[0];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2.5">
      {sortedMeetings.map((meeting, i) => {
        const meetingReviews = reviewsByMeeting.get(meeting.id) ?? [];
        const covers = meeting.books
          .map((b) => b.cover_url_hires || b.cover_url)
          .filter(Boolean) as string[];
        const isLatest = i === 0;

        return (
          <motion.button
            key={meeting.id}
            variants={itemVariants}
            whileHover={{ x: 3 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedMeetingId(meeting.id)}
            className="w-full text-left group cursor-pointer"
          >
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-[#D4C5B0]/50 bg-white/40 hover:bg-white/70 hover:border-[#C8956C]/50 hover:shadow-md transition-all duration-200">
              {/* 커버 스택 */}
              <div className="relative flex-shrink-0" style={{ width: covers.length > 1 ? 58 : 44, height: 64 }}>
                {covers.length === 0 ? (
                  <div className="w-11 h-16 bg-[#D4C5B0] rounded-lg shadow-sm flex items-center justify-center">
                    <BookOpen size={13} className="text-[#9C8E7E]" />
                  </div>
                ) : (
                  covers.slice(0, 3).map((cover, ci) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={ci}
                      src={cover}
                      alt=""
                      className="absolute object-cover rounded-lg shadow-sm"
                      style={{
                        width: 44,
                        height: 64,
                        left: ci * 7,
                        top: ci * -2,
                        zIndex: covers.length - ci,
                      }}
                    />
                  ))
                )}
              </div>

              {/* 모임 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                <h3 className="font-[family-name:var(--font-playfair)] text-lg italic text-[#1C1A17] leading-snug group-hover:text-[#8B3A2A] transition-colors duration-200 truncate">
                  {meeting.title}
                </h3>
                {meeting.books.length > 0 && (
                  <p className="text-xs text-[#9C8E7E] mt-0.5 truncate">
                    {meeting.books.map((b) => b.title).join(" · ")}
                  </p>
                )}
              </div>

              {/* 독후감 수 */}
              <div className="flex-shrink-0 text-right pr-1">
                <p className="font-[family-name:var(--font-playfair)] text-2xl italic text-[#1C1A17] leading-none">
                  {meetingReviews.length}
                </p>
                <p className="text-[9px] tracking-widest uppercase text-[#9C8E7E] mt-0.5">독후감</p>
              </div>

              <ChevronRight
                size={14}
                className="flex-shrink-0 text-[#9C8E7E] group-hover:translate-x-0.5 group-hover:text-[#8B3A2A] transition-all duration-200"
              />
            </div>
          </motion.button>
        );
      })}

      {/* 미지정 독후감 */}
      {unassigned.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="px-4 py-3 rounded-2xl border border-dashed border-[#D4C5B0] text-xs text-[#9C8E7E]"
        >
          모임 미지정 독후감 {unassigned.length}개
        </motion.div>
      )}
    </motion.div>
  );
}

// ── BY BOOK ──────────────────────────────────────────────────────
function BookView({ reviews, books }: { reviews: Review[]; books: Book[] }) {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<number, Review[]>();
    for (const r of reviews) {
      if (!map.has(r.book_id)) map.set(r.book_id, []);
      map.get(r.book_id)!.push(r);
    }
    return map;
  }, [reviews]);

  const bookMap = useMemo(() => {
    const m = new Map<number, Book>();
    for (const b of books) m.set(b.id, b);
    return m;
  }, [books]);

  const booksWithReviews = useMemo(() => books.filter((b) => grouped.has(b.id)), [books, grouped]);

  if (selectedBookId !== null) {
    const book = bookMap.get(selectedBookId);
    const items = grouped.get(selectedBookId) ?? [];
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button
          onClick={() => setSelectedBookId(null)}
          className="cursor-pointer text-xs text-[#9C8E7E] hover:text-[#1C1A17] tracking-wider uppercase mb-6 flex items-center gap-1.5 transition-colors duration-200 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform duration-200">←</span> 전체 도서
        </button>
        <div className="flex items-end gap-5 mb-8">
          {book?.cover_url_hires || book?.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(book.cover_url_hires || book.cover_url)!}
              alt={book?.title}
              className="w-20 h-[120px] object-cover rounded-xl shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-[120px] bg-[#D4C5B0] rounded-xl flex-shrink-0 shadow-lg" />
          )}
          <div>
            <p className="text-[11px] tracking-widest text-[#9C8E7E] uppercase mb-1">{items.length}개의 독후감</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl italic text-[#1C1A17]">{book?.title}</h2>
            <p className="text-sm text-[#9C8E7E] mt-1">{book?.author}</p>
          </div>
        </div>
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          {items.map((r) => (
            <motion.div key={r.id} variants={itemVariants}>
              <ReviewCard review={r} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  if (booksWithReviews.length === 0) return <EmptyState />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 gap-6"
    >
      {booksWithReviews.map((book) => {
        const count = grouped.get(book.id)?.length ?? 0;
        const cover = book.cover_url_hires || book.cover_url;
        return (
          <motion.button
            key={book.id}
            variants={itemVariants}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={() => setSelectedBookId(book.id)}
            className="text-left group cursor-pointer"
          >
            <div className="relative mb-3 overflow-hidden rounded-xl">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={book.title}
                  className="w-full aspect-[2/3] object-cover rounded-xl shadow-md group-hover:shadow-xl transition-shadow duration-300"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gradient-to-br from-[#D4C5B0] to-[#B8A898] rounded-xl shadow-md group-hover:shadow-xl transition-shadow duration-300 flex items-end p-3">
                  <span className="font-[family-name:var(--font-playfair)] text-sm italic text-[#5C4A3A] leading-tight">
                    {book.title}
                  </span>
                </div>
              )}
              <div className="absolute bottom-2.5 left-2.5">
                <motion.span
                  className="bg-[#1C1A17] text-[#F0EAE0] text-[10px] font-bold tracking-widest px-2 py-1 uppercase rounded-full"
                  whileHover={{ backgroundColor: "#8B3A2A" }}
                  transition={{ duration: 0.2 }}
                >
                  {count}개 독후감
                </motion.span>
              </div>
            </div>
            <h3 className="font-[family-name:var(--font-playfair)] text-base italic text-[#1C1A17] leading-snug group-hover:text-[#8B3A2A] transition-colors duration-200">
              {book.title}
            </h3>
            <p className="text-[11px] text-[#9C8E7E] mt-0.5 tracking-wide uppercase">{book.author}</p>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ── BY MEMBER ────────────────────────────────────────────────────
function MemberView({ reviews }: { reviews: Review[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const r of reviews) {
      if (!map.has(r.author_name)) map.set(r.author_name, []);
      map.get(r.author_name)!.push(r);
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [reviews]);

  if (grouped.length === 0) return <EmptyState />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-[#D4C5B0]/60">
      {grouped.map(({ name, items }) => {
        const latest = items[0];
        return (
          <motion.div key={name} variants={itemVariants} className="py-8 flex gap-0 md:gap-8">
            {/* 멤버 정보 (desktop) */}
            <div className="w-40 flex-shrink-0 hidden md:block">
              <div className="w-16 h-16 rounded-full bg-[#D4C5B0] flex items-center justify-center mb-3">
                <span className="font-[family-name:var(--font-playfair)] text-xl italic text-[#5C4A3A]">
                  {initials(name)}
                </span>
              </div>
              <h3 className="font-semibold text-[#1C1A17] text-base mb-0.5">{name}</h3>
              <div className="mt-3 flex justify-between text-[11px] tracking-widest uppercase text-[#9C8E7E]">
                <span>독후감</span>
                <span className="font-[family-name:var(--font-playfair)] text-lg italic text-[#1C1A17] leading-none">
                  {items.length}
                </span>
              </div>
            </div>

            {/* 최신 독후감 */}
            <div className="flex-1 min-w-0">
              {/* mobile: 멤버 인라인 */}
              <div className="flex items-center gap-3 mb-4 md:hidden">
                <div className="w-10 h-10 rounded-full bg-[#D4C5B0] flex items-center justify-center flex-shrink-0">
                  <span className="font-[family-name:var(--font-playfair)] text-sm italic text-[#5C4A3A]">
                    {initials(name)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-[#1C1A17] text-sm">{name}</p>
                  <p className="text-[11px] text-[#9C8E7E] tracking-wider">독후감 {items.length}개</p>
                </div>
              </div>

              <p className="text-[10px] tracking-widest uppercase text-[#9C8E7E] mb-2 flex items-center justify-between">
                <span>최신 독후감</span>
                <span>{format(new Date(latest.created_at), "yy.MM.dd", { locale: ko })}</span>
              </p>

              <Link href={`/reviews/${latest.id}`} className="group block cursor-pointer">
                <h4 className="font-[family-name:var(--font-playfair)] text-lg italic text-[#1C1A17] leading-snug mb-2 group-hover:text-[#8B3A2A] transition-colors duration-200">
                  {latest.books?.title ?? "제목 없음"}
                </h4>
                <p className="text-sm text-[#3D3530] leading-relaxed line-clamp-3">
                  &ldquo;{latest.content}&rdquo;
                </p>
                {latest.books && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="text-[10px] tracking-widest border border-[#C8956C]/60 text-[#8B3A2A] px-2 py-0.5 uppercase rounded-full">
                      {latest.books.title}
                    </span>
                  </div>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-[#9C8E7E] mt-3 group-hover:text-[#8B3A2A] transition-colors duration-200">
                  전문 읽기{" "}
                  <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </Link>

              {items.length > 1 && (
                <div className="mt-4 pt-4 border-t border-[#D4C5B0]/40 grid grid-cols-1 gap-2">
                  {items.slice(1, 3).map((r) => (
                    <Link
                      key={r.id}
                      href={`/reviews/${r.id}`}
                      className="flex items-center justify-between gap-3 text-xs text-[#9C8E7E] hover:text-[#1C1A17] transition-colors duration-200 cursor-pointer"
                    >
                      <span className="truncate">{r.books?.title ?? "—"}</span>
                      <span className="flex-shrink-0">{format(new Date(r.created_at), "yy.MM.dd")}</span>
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[11px] text-[#9C8E7E]/60">+ {items.length - 3}개 더</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
      <p className="font-[family-name:var(--font-playfair)] text-xl italic text-[#9C8E7E]">
        아직 독후감이 없습니다.
      </p>
      <Link
        href="/reviews/new"
        className="inline-block mt-4 text-sm text-[#8B3A2A] underline underline-offset-4 hover:text-[#1C1A17] transition-colors duration-200 cursor-pointer"
      >
        첫 번째로 작성해보세요
      </Link>
    </motion.div>
  );
}

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");
  const view: ViewMode = rawView === "book" || rawView === "member" ? rawView : "gathering";

  const [reviews, setReviews] = useState<Review[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);

  function setView(v: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/reviews").then((r) => r.json()),
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/meetings").then((r) => r.json()),
    ]).then(([rv, bk, mt]) => {
      setReviews(rv);
      setBooks(bk);
      setMeetings(mt);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex gap-0 md:gap-10 min-h-[60vh]">
      {/* ── 사이드바 ── */}
      <aside className="hidden md:block w-44 flex-shrink-0 pt-1">
        <p className="font-[family-name:var(--font-playfair)] italic text-[#1C1A17] text-lg mb-0.5">독후감</p>
        <p className="text-[9px] tracking-[0.2em] text-[#9C8E7E] uppercase mb-6">Curated Reports</p>

        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.mode}
              onClick={() => setView(item.mode)}
              className={`cursor-pointer w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-200 border-l-2 rounded-r-lg ${
                view === item.mode
                  ? "border-l-[#8B3A2A] bg-[#EAE0D0]/60 text-[#1C1A17]"
                  : "border-l-transparent text-[#9C8E7E] hover:text-[#1C1A17] hover:bg-[#EAE0D0]/40"
              }`}
            >
              <span className={`transition-colors duration-200 ${view === item.mode ? "text-[#8B3A2A]" : ""}`}>
                {item.icon}
              </span>
              <div>
                <p className="text-[9px] tracking-[0.15em] uppercase leading-none mb-0.5 opacity-60">{item.sublabel}</p>
                <p className="text-sm font-medium leading-none">{item.label}</p>
              </div>
            </button>
          ))}
        </nav>

        <div className="mt-8 border-t border-[#D4C5B0]/60 pt-6">
          <Link
            href="/reviews/new"
            className="cursor-pointer flex items-center gap-2 text-xs text-[#8B3A2A] hover:text-[#1C1A17] transition-colors duration-200 group"
          >
            <PenLine size={13} className="group-hover:rotate-[-8deg] transition-transform duration-200" />
            <span className="tracking-wide">독후감 쓰기</span>
          </Link>
        </div>
      </aside>

      {/* ── 모바일 탭 ── */}
      <div className="md:hidden w-full mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-[family-name:var(--font-playfair)] text-xl italic text-[#1C1A17]">독후감</h1>
          <Link
            href="/reviews/new"
            className="cursor-pointer flex items-center gap-1.5 text-xs text-[#8B3A2A] border border-[#C8956C]/60 px-3 py-1.5 rounded-full hover:bg-[#EAE0D0]/60 hover:border-[#C8956C] transition-all duration-200"
          >
            <PenLine size={12} />
            독후감 쓰기
          </Link>
        </div>
        <div className="flex border-b border-[#D4C5B0]">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.mode}
              onClick={() => setView(item.mode)}
              className={`cursor-pointer flex-1 py-2.5 text-xs font-medium tracking-wide border-b-2 transition-all duration-200 ${
                view === item.mode
                  ? "border-b-[#8B3A2A] text-[#1C1A17]"
                  : "border-b-transparent text-[#9C8E7E] hover:text-[#1C1A17]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 메인 컨텐츠 ── */}
      <div className="flex-1 min-w-0">
        {/* 데스크톱 헤더 */}
        <div className="hidden md:block mb-8">
          <div className="flex items-start justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="font-[family-name:var(--font-playfair)] text-3xl italic text-[#1C1A17]">
                  {VIEW_TITLES[view].title}
                </h1>
                <p className="text-sm text-[#9C8E7E] mt-1.5 italic">{VIEW_TITLES[view].subtitle}</p>
              </motion.div>
            </AnimatePresence>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                href="/reviews/new"
                className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#F0EAE0] bg-[#1C1A17] px-4 py-2 rounded-full hover:bg-[#8B3A2A] transition-colors duration-200 flex-shrink-0"
              >
                <PenLine size={14} />
                독후감 쓰기
              </Link>
            </motion.div>
          </div>
          <div className="mt-5 border-b border-[#D4C5B0]" />
        </div>

        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
            <p className="font-[family-name:var(--font-playfair)] italic text-[#9C8E7E] text-lg animate-pulse">
              불러오는 중...
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={pageVariants} initial="hidden" animate="show" exit="exit">
              {view === "gathering" && <GatheringView reviews={reviews} meetings={meetings} />}
              {view === "book" && <BookView reviews={reviews} books={books} />}
              {view === "member" && <MemberView reviews={reviews} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
