import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function transformMeeting(m: any) {
  return {
    ...m,
    books: (m.meeting_books ?? []).map((mb: any) => mb.books).filter(Boolean),
    meeting_books: undefined,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [meetingRes, attendeesRes, reviewsRes] = await Promise.all([
    supabase.from("meetings").select("*, meeting_books(books(*))").eq("id", id).single(),
    supabase.from("attendees").select("*").eq("meeting_id", id).order("created_at"),
    supabase.from("reviews").select("id, author_name, content, book_id, created_at, books(title, author)").eq("meeting_id", id).order("created_at", { ascending: false }),
  ]);
  if (meetingRes.error) return NextResponse.json({ error: meetingRes.error.message }, { status: 404 });
  return NextResponse.json({
    meeting: transformMeeting(meetingRes.data),
    attendees: attendeesRes.data ?? [],
    reviews: reviewsRes.data ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { book_ids, ...meetingFields } = body;
  const supabase = await createClient();

  if (Object.keys(meetingFields).length > 0) {
    const { error } = await supabase.from("meetings").update(meetingFields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (book_ids !== undefined) {
    await supabase.from("meeting_books").delete().eq("meeting_id", id);
    if ((book_ids as number[]).length > 0) {
      await supabase.from("meeting_books").insert(
        (book_ids as number[]).map((bid) => ({ meeting_id: Number(id), book_id: bid }))
      );
    }
  }

  const { data, error } = await supabase
    .from("meetings")
    .select("*, meeting_books(books(id, title, author))")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(transformMeeting(data));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
