import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import MeetingDetailClient from "./_meeting-detail-client";

export const dynamic = "force-dynamic";

type Book = { title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
type MeetingRow = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  summary: string | null;
  meeting_books: { books: Book | null }[] | null;
};

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meetingRes, attendeesRes, reviewsRes, membersRes] = await Promise.all([
    supabase.from("meetings").select("*, meeting_books(books(title, author, cover_url, cover_url_hires))").eq("id", id).single(),
    supabase.from("attendees").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("reviews").select("id, author_name, content, created_at").eq("meeting_id", id).order("created_at", { ascending: false }),
    supabase.from("members").select("id, name").order("name"),
  ]);

  if (!meetingRes.data) notFound();

  const { meeting_books, ...meetingRow } = meetingRes.data as MeetingRow;
  const meeting = {
    ...meetingRow,
    books: (meeting_books ?? []).map((mb) => mb.books).filter((b): b is Book => Boolean(b)),
  };

  return (
    <MeetingDetailClient
      meetingId={Number(id)}
      meeting={meeting}
      attendees={attendeesRes.data ?? []}
      reviews={reviewsRes.data ?? []}
      members={membersRes.data ?? []}
    />
  );
}
