"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BookOpen, BookMarked, Users, PenLine, ChevronRight } from "lucide-react";

type Review = {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  book_id: number;
  meeting_id: number | null;
  books: { title: string; author: string } | null;
  meetings: { title: string; date: string } | null;
};

type Book = {
  id: number;
  title: string;
  author: string;
  cover_url?: string | null;
  cover_url_hires?: string | null;
};

type ViewMode = "gathering" | "book" | "member";

const NAV_ITEMS: { mode: ViewMode; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { mode: "gathering", label: "모임 별", sublabel: "BY GATHERING", icon: <BookOpen size={14} /> },
  { mode: "book", label: "도서 별", sublabel: "BY BOOK", icon: <BookMarked size={14} /> },
  { mode: "member", label: "참석자 별", sublabel: "BY MEMBER", icon: <Users size={14} /> },
];

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Link href={`/reviews/${review.id}`} className="block group">
      <div className="border-b border-[#D4C5B0]/60 py-5 hover:bg-[#EAE0D0]/40 -mx-4 px-4 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1C1A17] text-[#F0EAE0] text-[10px] font-bold tracking-wide flex-shrink-0">
              {initials(review.author_name)}
            </span>
            <div>
              <p className="text-xs font-semibold tracking-widest text-[#1C1A17] uppercase leading-none">
                {review.author_name}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-[#9C8E7E] flex-shrink-0 pt-1">
            {format(new Date(review.created_at), "yy.MM.dd", { locale: ko })}
          </span>
        </div>
        <p className="text-sm text-[#3D3530] leading-relaxed line-clamp-2 mt-1 group-hover:text-[#1C1A17] transition-colors">
          {review.content}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] text-[#9C8E7E] mt-2 group-hover:text-[#8B3A2A] transition-colors">
          전문 읽기 <ChevronRight size={10} />
        </span>
      </div>
    </Link>
  );
}

// ── BY GATHERING ────────────────────────────────────────────────
function GatheringView({ reviews }: { reviews: Review[] }) {
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; date: string | null; items: Review[] }
    >();

    for (const r of reviews) {
      const key = r.meeting_id != null ? String(r.meeting_id) : "__none__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: r.meetings?.title ?? "모임 미지정",
          date: r.meetings?.date ?? null,
          items: [],
        });
      }
      map.get(key)!.items.push(r);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }, [reviews]);

  if (grouped.length === 0)
    return <EmptyState />;

  return (
    <div className="space-y-12">
      {grouped.map((group, i) => (
        <section key={group.key}>
          <div className="flex items-baseline gap-3 mb-6">
            {i === 0 && group.date && (
              <span className="text-[10px] font-bold tracking-widest border border-[#1C1A17] text-[#1C1A17] px-2 py-0.5 uppercase">
                최신
              </span>
            )}
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl italic text-[#1C1A17]">
              {group.title}
            </h2>
            {group.date && (
              <span className="text-xs text-[#9C8E7E] tracking-wider uppercase">
                {format(new Date(group.date), "yyyy. MM. dd", { locale: ko })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {/* 첫 번째 리뷰는 크게 */}
            {group.items[0] && (
              <div className="md:col-span-2 mb-2">
                <ReviewCard review={group.items[0]} />
              </div>
            )}
            {group.items.slice(1).map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>

          {group.items.length >= 5 && (
            <p className="text-[11px] text-[#9C8E7E] mt-4 tracking-wider">
              {group.items.length}개의 독후감
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

// ── BY BOOK ─────────────────────────────────────────────────────
function BookView({
  reviews,
  books,
}: {
  reviews: Review[];
  books: Book[];
}) {
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

  // books that actually have reviews
  const booksWithReviews = useMemo(
    () => books.filter((b) => grouped.has(b.id)),
    [books, grouped]
  );

  if (selectedBookId !== null) {
    const book = bookMap.get(selectedBookId);
    const items = grouped.get(selectedBookId) ?? [];
    return (
      <div>
        <button
          onClick={() => setSelectedBookId(null)}
          className="text-xs text-[#9C8E7E] hover:text-[#1C1A17] tracking-wider uppercase mb-6 flex items-center gap-1 transition-colors"
        >
          ← 전체 도서
        </button>
        <div className="flex items-end gap-5 mb-8">
          {book?.cover_url_hires || book?.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(book.cover_url_hires || book.cover_url)!}
              alt={book?.title}
              className="w-20 h-28 object-cover shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-28 bg-[#D4C5B0] flex-shrink-0 shadow-lg" />
          )}
          <div>
            <p className="text-[11px] tracking-widest text-[#9C8E7E] uppercase mb-1">
              {items.length}개의 독후감
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl italic text-[#1C1A17]">
              {book?.title}
            </h2>
            <p className="text-sm text-[#9C8E7E] mt-1">{book?.author}</p>
          </div>
        </div>
        <div>
          {items.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </div>
    );
  }

  if (booksWithReviews.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {booksWithReviews.map((book) => {
        const count = grouped.get(book.id)?.length ?? 0;
        const cover = book.cover_url_hires || book.cover_url;
        return (
          <button
            key={book.id}
            onClick={() => setSelectedBookId(book.id)}
            className="text-left group"
          >
            <div className="relative mb-3 overflow-hidden">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={book.title}
                  className="w-full aspect-[3/4] object-cover shadow-md group-hover:shadow-lg transition-shadow"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gradient-to-br from-[#D4C5B0] to-[#B8A898] shadow-md group-hover:shadow-lg transition-shadow flex items-end p-3">
                  <span className="font-[family-name:var(--font-playfair)] text-sm italic text-[#5C4A3A] leading-tight">
                    {book.title}
                  </span>
                </div>
              )}
              <div className="absolute bottom-2.5 left-2.5">
                <span className="bg-[#1C1A17] text-[#F0EAE0] text-[10px] font-bold tracking-widest px-2 py-1 uppercase">
                  {count}개 독후감
                </span>
              </div>
            </div>
            <h3 className="font-[family-name:var(--font-playfair)] text-base italic text-[#1C1A17] leading-snug group-hover:text-[#8B3A2A] transition-colors">
              {book.title}
            </h3>
            <p className="text-[11px] text-[#9C8E7E] mt-0.5 tracking-wide uppercase">
              {book.author}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ── BY MEMBER ───────────────────────────────────────────────────
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
    <div className="space-y-0 divide-y divide-[#D4C5B0]/60">
      {grouped.map(({ name, items }) => {
        const latest = items[0];
        return (
          <div key={name} className="py-8 flex gap-0 md:gap-8">
            {/* 멤버 정보 */}
            <div className="w-40 flex-shrink-0 hidden md:block">
              <div className="w-16 h-16 rounded-full bg-[#D4C5B0] flex items-center justify-center mb-3">
                <span className="font-[family-name:var(--font-playfair)] text-xl italic text-[#5C4A3A]">
                  {initials(name)}
                </span>
              </div>
              <h3 className="font-semibold text-[#1C1A17] text-base mb-0.5">{name}</h3>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] tracking-widest uppercase text-[#9C8E7E]">
                  <span>독후감</span>
                  <span className="font-[family-name:var(--font-playfair)] text-lg italic text-[#1C1A17] leading-none">
                    {items.length}
                  </span>
                </div>
              </div>
            </div>

            {/* 최신 독후감 */}
            <div className="flex-1 min-w-0">
              {/* mobile: 멤버 정보 인라인 */}
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

              <Link href={`/reviews/${latest.id}`} className="group block">
                <h4 className="font-[family-name:var(--font-playfair)] text-lg italic text-[#1C1A17] leading-snug mb-2 group-hover:text-[#8B3A2A] transition-colors">
                  {latest.books?.title ?? "제목 없음"}
                </h4>
                <p className="text-sm text-[#3D3530] leading-relaxed line-clamp-3">
                  &ldquo;{latest.content}&rdquo;
                </p>

                {latest.books && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="text-[10px] tracking-widest border border-[#C8956C]/60 text-[#8B3A2A] px-2 py-0.5 uppercase">
                      {latest.books.title}
                    </span>
                  </div>
                )}

                <span className="inline-flex items-center gap-1 text-[11px] text-[#9C8E7E] mt-3 group-hover:text-[#8B3A2A] transition-colors">
                  전문 읽기 <ChevronRight size={10} />
                </span>
              </Link>

              {items.length > 1 && (
                <div className="mt-4 pt-4 border-t border-[#D4C5B0]/40 grid grid-cols-1 gap-2">
                  {items.slice(1, 3).map((r) => (
                    <Link
                      key={r.id}
                      href={`/reviews/${r.id}`}
                      className="flex items-center justify-between gap-3 text-xs text-[#9C8E7E] hover:text-[#1C1A17] transition-colors"
                    >
                      <span className="truncate">{r.books?.title ?? "—"}</span>
                      <span className="flex-shrink-0">
                        {format(new Date(r.created_at), "yy.MM.dd")}
                      </span>
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[11px] text-[#9C8E7E]/60">+ {items.length - 3}개 더</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 text-center">
      <p className="font-[family-name:var(--font-playfair)] text-xl italic text-[#9C8E7E]">
        아직 독후감이 없습니다.
      </p>
      <Link
        href="/reviews/new"
        className="inline-block mt-4 text-sm text-[#8B3A2A] underline underline-offset-4"
      >
        첫 번째로 작성해보세요
      </Link>
    </div>
  );
}

export default function ReviewsPage() {
  const [view, setView] = useState<ViewMode>("gathering");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reviews").then((r) => r.json()),
      fetch("/api/books").then((r) => r.json()),
    ]).then(([rv, bk]) => {
      setReviews(rv);
      setBooks(bk);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex gap-0 md:gap-10 min-h-[60vh]">
      {/* ── 사이드바 ── */}
      <aside className="hidden md:block w-44 flex-shrink-0 pt-1">
        <p className="font-[family-name:var(--font-playfair)] italic text-[#1C1A17] text-lg mb-0.5">
          독후감
        </p>
        <p className="text-[9px] tracking-[0.2em] text-[#9C8E7E] uppercase mb-6">
          Curated Reports
        </p>

        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.mode}
              onClick={() => setView(item.mode)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all border-l-2 ${
                view === item.mode
                  ? "border-l-[#8B3A2A] bg-[#EAE0D0]/60 text-[#1C1A17]"
                  : "border-l-transparent text-[#9C8E7E] hover:text-[#1C1A17] hover:bg-[#EAE0D0]/30"
              }`}
            >
              <span className={view === item.mode ? "text-[#8B3A2A]" : ""}>
                {item.icon}
              </span>
              <div>
                <p className="text-[9px] tracking-[0.15em] uppercase leading-none mb-0.5 opacity-60">
                  {item.sublabel}
                </p>
                <p className="text-sm font-medium leading-none">{item.label}</p>
              </div>
            </button>
          ))}
        </nav>

        <div className="mt-8 border-t border-[#D4C5B0]/60 pt-6">
          <Link
            href="/reviews/new"
            className="flex items-center gap-2 text-xs text-[#8B3A2A] hover:text-[#1C1A17] transition-colors group"
          >
            <PenLine size={13} />
            <span className="tracking-wide">독후감 쓰기</span>
          </Link>
        </div>
      </aside>

      {/* ── 모바일 탭 ── */}
      <div className="md:hidden w-full mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-[family-name:var(--font-playfair)] text-xl italic text-[#1C1A17]">
            독후감
          </h1>
          <Link
            href="/reviews/new"
            className="flex items-center gap-1.5 text-xs text-[#8B3A2A] border border-[#C8956C]/60 px-3 py-1.5 hover:bg-[#EAE0D0]/60 transition-colors"
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
              className={`flex-1 py-2.5 text-xs font-medium tracking-wide border-b-2 transition-colors ${
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
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl italic text-[#1C1A17]">
                {view === "gathering" && "모임별 독후감"}
                {view === "book" && "도서별 독후감"}
                {view === "member" && "참석자별 독후감"}
              </h1>
              <p className="text-sm text-[#9C8E7E] mt-1.5 italic">
                {view === "gathering" && "각 모임에 제출된 독후감을 모임순으로 봅니다."}
                {view === "book" && "도서별로 모아 읽는 우리들의 시선."}
                {view === "member" && "참석자가 남긴 독서의 흔적들."}
              </p>
            </div>
            <Link
              href="/reviews/new"
              className="flex items-center gap-2 text-sm font-medium text-[#F0EAE0] bg-[#1C1A17] px-4 py-2 hover:bg-[#8B3A2A] transition-colors flex-shrink-0"
            >
              <PenLine size={14} />
              독후감 쓰기
            </Link>
          </div>
          <div className="mt-5 border-b border-[#D4C5B0]" />
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="font-[family-name:var(--font-playfair)] italic text-[#9C8E7E] text-lg animate-pulse">
              불러오는 중...
            </p>
          </div>
        ) : (
          <>
            {view === "gathering" && <GatheringView reviews={reviews} />}
            {view === "book" && <BookView reviews={reviews} books={books} />}
            {view === "member" && <MemberView reviews={reviews} />}
          </>
        )}
      </div>
    </div>
  );
}
