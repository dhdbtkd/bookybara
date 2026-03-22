import { createClient } from "@/utils/supabase/server";
import BooksView from "./_books-view";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const supabase = await createClient();

  const [{ data: books }, { data: candidates }, { data: members }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, cover_url, cover_url_hires, description, meeting_books(meetings(id, date, title))")
      .order("created_at", { ascending: false }),
    supabase
      .from("book_candidates")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("members").select("id, name").order("name"),
  ]);

  const today = new Date().toISOString().split("T")[0];

  const allBooks = (books ?? []).map((b) => ({
    ...b,
    meetings: ((b.meeting_books ?? []) as any[]).map((mb) => mb.meetings).filter(Boolean) as {
      id: number; date: string; title: string;
    }[],
  }));

  // 읽는 중: 미래 모임이 하나라도 있는 책
  const readingBooks = allBooks
    .filter((b) => b.meetings.some((m) => m.date >= today))
    .sort((a, b) => {
      const aDate = Math.min(...a.meetings.filter((m) => m.date >= today).map((m) => new Date(m.date).getTime()));
      const bDate = Math.min(...b.meetings.filter((m) => m.date >= today).map((m) => new Date(m.date).getTime()));
      return aDate - bDate;
    });

  // 완독: 과거 모임만 있는 책
  const readBooks = allBooks
    .filter((b) => b.meetings.some((m) => m.date < today) && b.meetings.every((m) => m.date < today))
    .sort((a, b) => {
      const aDate = Math.max(...a.meetings.map((m) => new Date(m.date).getTime()));
      const bDate = Math.max(...b.meetings.map((m) => new Date(m.date).getTime()));
      return bDate - aDate;
    });

  return (
    <div className="-mx-4 -mt-4 md:-mt-8">
      <div className="px-4 sm:px-8 pt-10 pb-8 border-b border-[#DDD5C8]">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#8B3A2A] mb-3">도서</p>
        <h1 className="text-[2.8rem] leading-tight text-[#1C1A17] font-bold">책 리스트</h1>
        <p className="text-sm text-[#6B5E52] mt-3">읽은 책과 후보 도서를 확인하세요.</p>
      </div>

      <div className="px-4 sm:px-8 py-8">
        <BooksView
          readingBooks={readingBooks}
          readBooks={readBooks}
          candidates={(candidates ?? []) as any}
          members={(members ?? []) as { id: number; name: string }[]}
        />
      </div>
    </div>
  );
}
