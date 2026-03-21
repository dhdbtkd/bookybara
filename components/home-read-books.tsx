"use client";

import { BookOpen } from "lucide-react";

type Book = { id: number; title: string; author: string; cover_url: string | null; cover_url_hires: string | null };

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
      className="mt-16 py-12 overflow-hidden"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
    >
      {/* 헤더 */}
      <div className="px-6 sm:px-10 max-w-4xl mx-auto mb-8">
        <h2
          className="text-2xl sm:text-3xl font-bold text-[#1C1A17] leading-tight mb-1.5"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          지금까지 읽은 책 리스트
        </h2>
        <p className="text-sm text-neutral-400">우리가 함께 읽어온 책들입니다.</p>
      </div>

      {/* 마퀴 트랙 */}
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
        {items.map((book, i) => (
          <div
            key={`${book.id}-${i}`}
            className="flex-shrink-0"
            style={{ width: `${SLOT_W}px`, paddingRight: `${GAP}px` }}
          >
            {/* 표지: 2:3 비율 + 둥근 모서리 */}
            <div
              className="w-full rounded-2xl overflow-hidden bg-[#E8DDD0] shadow-md mb-3"
              style={{ aspectRatio: "2 / 3" }}
            >
              {book.cover_url_hires ?? book.cover_url ? (
                <img
                  src={book.cover_url_hires ?? book.cover_url!}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
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
          </div>
        ))}
      </div>
    </section>
  );
}
