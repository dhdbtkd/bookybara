"use client";

import { useRef } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

type Book = { id: number; title: string; author: string; cover_url: string | null };

export default function HomeReadBooks({ books }: { books: Book[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  }

  return (
    <section className="-mx-4 mt-16 py-12 px-4 sm:px-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1A17] leading-tight mb-1.5">
            지금까지 읽은 책 리스트
          </h2>
          <p className="text-sm text-neutral-400">우리가 함께 읽어온 책들입니다.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 mt-1">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 border border-neutral-300 flex items-center justify-center text-neutral-500 hover:border-[#1C1A17] hover:text-[#1C1A17] transition-colors cursor-pointer"
            aria-label="이전"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 border border-neutral-300 flex items-center justify-center text-neutral-500 hover:border-[#1C1A17] hover:text-[#1C1A17] transition-colors cursor-pointer"
            aria-label="다음"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 카드 스크롤 */}
      {books.length === 0 ? (
        <p className="text-sm text-neutral-400 py-6">아직 읽은 책이 없어요.</p>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {books.map((book) => (
            <div key={book.id} className="flex-shrink-0 w-[240px] sm:w-[280px]">
              <div className="relative w-full overflow-hidden bg-[#E8DDD0] shadow-md mb-3" style={{ aspectRatio: "3 / 4" }}>
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-[#B8A898]" />
                  </div>
                )}
              </div>
              <p
                className="text-[17px] font-bold text-[#1C1A17] leading-snug line-clamp-2 mb-1"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {book.title}
              </p>
              <p className="text-sm text-neutral-400" style={{ fontStyle: "italic" }}>
                {book.author}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
