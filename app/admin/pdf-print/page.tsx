import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PrintClient from "./_print-client";

export const dynamic = "force-dynamic";

const BOOKS_SELECT = "meeting_books(books(id, title, author, cover_url, cover_url_hires))";

export default async function PdfPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string; members?: string }>;
}) {
  const { meeting: meetingId, members: membersParam } = await searchParams;

  if (!meetingId) notFound();

  const selectedMembers = membersParam ? membersParam.split(",").map((m) => decodeURIComponent(m)) : [];
  if (selectedMembers.length === 0) notFound();

  const supabase = await createClient();

  const [meetingRes, reviewsRes, questionsRes] = await Promise.all([
    supabase
      .from("meetings")
      .select(`id, title, date, location, ${BOOKS_SELECT}`)
      .eq("id", meetingId)
      .single(),
    supabase
      .from("reviews")
      .select("id, author_name, content, book_id, books(title, author)")
      .eq("meeting_id", meetingId)
      .in("author_name", selectedMembers)
      .order("created_at"),
    supabase
      .from("discussion_questions")
      .select("id, book_id, questions, books(title, author)")
      .eq("meeting_id", meetingId)
      .eq("is_public", true),
  ]);

  if (!meetingRes.data) notFound();

  const meeting = {
    ...meetingRes.data,
    books: ((meetingRes.data as any).meeting_books ?? []).map((mb: any) => mb.books).filter(Boolean),
    meeting_books: undefined,
  };

  return (
    <Suspense>
      <PrintClient
        meeting={meeting as any}
        reviews={(reviewsRes.data ?? []) as any}
        questions={(questionsRes.data ?? []) as any}
        selectedMembers={selectedMembers}
      />
    </Suspense>
  );
}
