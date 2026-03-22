import { createClient } from "@/utils/supabase/server";
import MotionPage from "@/components/motion-page";
import { Suspense } from "react";
import DiscussionClient from "./_discussion-client";

export const dynamic = "force-dynamic";

const BOOKS_SELECT = "meeting_books(books(id, title, author, cover_url, cover_url_hires))";

export default async function DiscussionPage() {
  const supabase = await createClient();

  const [{ data: rawMeetings }, { data: questions }] = await Promise.all([
    supabase
      .from("meetings")
      .select(`id, title, date, location, ${BOOKS_SELECT}`)
      .order("date", { ascending: false }),
    supabase
      .from("discussion_questions")
      .select("id, meeting_id, book_id, questions, books(title, author)")
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
  ]);

  const meetings = (rawMeetings ?? []).map((m: any) => ({
    ...m,
    books: (m.meeting_books ?? []).map((mb: any) => mb.books).filter(Boolean),
    meeting_books: undefined,
  }));

  return (
    <MotionPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-[#1C1A17] text-lg mb-0.5">토론 질문</h1>
          <p className="text-sm text-[#9C8E7E]">AI가 생성한 모임별 토론 질문입니다.</p>
        </div>
        <Suspense>
          <DiscussionClient meetings={meetings} questions={(questions ?? []) as any} />
        </Suspense>
      </div>
    </MotionPage>
  );
}
