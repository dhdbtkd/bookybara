import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
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

// 메타데이터와 페이지가 같은 조회를 두 번 하지 않도록 한 요청 안에서 공유한다.
const getMeeting = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("*, meeting_books(books(title, author, cover_url, cover_url_hires))")
    .eq("id", id)
    .single();
  return data as MeetingRow | null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) return { title: "모임을 찾을 수 없습니다", robots: { index: false, follow: false } };

  const books = (meeting.meeting_books ?? []).map((mb) => mb.books).filter((b): b is Book => Boolean(b));
  const dateLabel = format(new Date(`${meeting.date}T00:00:00`), "yyyy년 M월 d일", { locale: ko });
  const bookLabel = books.length > 0 ? `${books.map((b) => b.title).join(", ")} · ` : "";
  const description = `${bookLabel}${dateLabel}${meeting.location ? ` · ${meeting.location}` : ""} 독서모임 기록과 참석자들의 독후감.`;
  const cover = books[0]?.cover_url_hires ?? books[0]?.cover_url ?? null;

  return {
    title: meeting.title,
    description,
    alternates: { canonical: `/meetings/${id}` },
    openGraph: {
      type: "article",
      title: meeting.title,
      description,
      url: `/meetings/${id}`,
      images: cover ? [{ url: cover, alt: books[0]?.title ?? meeting.title }] : undefined,
    },
  };
}

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meetingRow, attendeesRes, reviewsRes, membersRes] = await Promise.all([
    getMeeting(id),
    supabase.from("attendees").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("reviews").select("id, author_name, content, created_at").eq("meeting_id", id).order("created_at", { ascending: false }),
    supabase.from("members").select("id, name").order("name"),
  ]);

  if (!meetingRow) notFound();

  const { meeting_books, ...meetingFields } = meetingRow;
  const meeting = {
    ...meetingFields,
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
