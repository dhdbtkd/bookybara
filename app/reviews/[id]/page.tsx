import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import MotionPage from "@/components/motion-page";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: review } = await supabase
    .from("reviews")
    .select("*, books(title, author, cover_url, cover_url_hires), meetings(title, date)")
    .eq("id", id)
    .single();

  if (!review) notFound();

  const book = review.books as { title: string; author: string; cover_url: string | null; cover_url_hires: string | null } | null;
  const meeting = review.meetings as { title: string; date: string } | null;

  return (
    <MotionPage>
      <div className="max-w-2xl mx-auto">
        {/* 브레드크럼 */}
        <Link
          href="/reviews"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-[#9C8E7E] hover:text-[#1C1A17] transition-colors duration-200 mb-8 group"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          독후감 목록
        </Link>

        {/* 메타 태그 */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {book && (
            <span className="text-[10px] font-bold tracking-widest border border-[#C8956C]/60 text-[#8B3A2A] px-3 py-1 uppercase rounded-full">
              {book.title}
            </span>
          )}
          {meeting && (
            <span className="text-[10px] font-bold tracking-widest border border-[#D4C5B0] text-[#9C8E7E] px-3 py-1 uppercase rounded-full">
              {meeting.title}
            </span>
          )}
        </div>

        {/* 헤더 */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-12 h-12 rounded-full bg-[#1C1A17] flex items-center justify-center flex-shrink-0">
            <span className="font-[family-name:var(--font-playfair)] text-base italic text-[#F0EAE0]">
              {review.author_name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl italic text-[#1C1A17]">
              {review.author_name}
            </h1>
            <p className="text-xs text-[#9C8E7E] mt-1 tracking-wide">
              {format(new Date(review.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
            </p>
          </div>
          {book && (book.cover_url_hires || book.cover_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(book.cover_url_hires || book.cover_url)!}
              alt={book.title}
              className="ml-auto w-14 h-20 object-cover rounded-xl shadow-md flex-shrink-0"
            />
          )}
        </div>

        {/* 구분선 */}
        <div className="border-t border-[#D4C5B0] mb-8" />

        {/* 본문 */}
        <div className="text-sm leading-[1.85] text-[#2C2520] whitespace-pre-wrap mb-10">
          {review.content}
        </div>

        {/* 하단 */}
        <div className="border-t border-[#D4C5B0] pt-6 flex items-center justify-between">
          <Link
            href="/reviews"
            className="text-sm text-[#9C8E7E] hover:text-[#1C1A17] transition-colors duration-200"
          >
            ← 목록으로
          </Link>
          <Link
            href="/reviews/new"
            className="flex items-center gap-2 text-sm font-medium text-[#F0EAE0] bg-[#1C1A17] px-4 py-2 rounded-full hover:bg-[#8B3A2A] transition-colors duration-200 cursor-pointer"
          >
            내 독후감 쓰기
          </Link>
        </div>
      </div>
    </MotionPage>
  );
}
