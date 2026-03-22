"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

type BookMeeting = { id: number; date: string };
type Book = { id: number; title: string; author: string; cover_url: string | null; cover_url_hires: string | null; meetings?: BookMeeting[] };

// 아이템 너비와 간격을 고정값으로 관리
// 슬롯 너비 = CARD_W + GAP — 모든 아이템이 동일 슬롯을 가지므로
// 한 세트 너비 = N * SLOT_W → translateX(-50%) 가 정확히 첫 세트 끝에 닿음
const CARD_W = 160;
const GAP    = 40;
const SLOT_W = CARD_W + GAP;
const MIN_VIEWPORT = 1920;

export default function HomeReadBooks({ books }: { books: Book[] }) {
  if (books.length === 0) return null;

  const itemsNeeded = Math.ceil(MIN_VIEWPORT / SLOT_W) + 4;
  const repeatCount = Math.ceil(itemsNeeded / books.length);
  const oneSet = Array.from({ length: repeatCount }, () => books).flat();
  const items  = [...oneSet, ...oneSet];

  const duration = `${Math.max(books.length * 5, 25)}s`;

  return (
    <section
      className="mt-16 py-12 overflow-x-hidden"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
    >
      {/* 헤더 */}
      <div className="px-6 sm:px-10 max-w-4xl mx-auto mb-8">
        <h2
          className="text-2xl sm:text-3xl font-bold text-[#1C1A17] leading-tight mb-1.5"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          읽은 책들
        </h2>
      </div>

      {/* 마퀴 트랙 — 좌우 fade mask */}
      <div
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      >
      <div
        className="flex animate-marquee"
        style={
          {
            width: `${items.length * SLOT_W}px`,
            "--marquee-duration": duration,
            willChange: "transform",
          } as React.CSSProperties
        }
      >
        {items.map((book, i) => {
          const meetingId = book.meetings && book.meetings.length > 0
            ? book.meetings.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).id
            : null;
          const Wrapper = meetingId
            ? ({ children }: { children: React.ReactNode }) => (
                <Link href={`/meetings/${meetingId}`} className="block group">
                  {children}
                </Link>
              )
            : ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

          return (
            <div
              key={`${book.id}-${i}`}
              className="flex-shrink-0"
              style={{ width: `${SLOT_W}px`, paddingRight: `${GAP}px` }}
            >
              <Wrapper>
                {/* 표지: 2:3 비율 + 둥근 모서리 */}
                <div
                  className="w-full mb-3 transition-transform duration-300 group-hover:scale-[1.07] group-hover:drop-shadow-xl"
                  style={{ aspectRatio: "2 / 3" }}
                >
                  {book.cover_url_hires ?? book.cover_url ? (
                    <img
                      src={book.cover_url_hires ?? book.cover_url!}
                      alt={book.title}
                      className="w-full h-full object-cover rounded-2xl shadow-md"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-2xl bg-[#E8DDD0] shadow-md">
                      <BookOpen className="w-7 h-7 text-[#B8A898]" />
                    </div>
                  )}
                </div>
                <p
                  className="text-xs font-semibold text-[#1C1A17] leading-snug line-clamp-2 mb-0.5"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {book.title}
                </p>
                <p className="text-[11px] text-neutral-400 truncate" style={{ fontStyle: "italic" }}>
                  {book.author}
                </p>
              </Wrapper>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}
