import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BOOKS_SELECT = "meeting_books(books(id, title, author, cover_url, cover_url_hires))";

function transformMeeting(m: any) {
  return {
    ...m,
    books: (m.meeting_books ?? []).map((mb: any) => mb.books).filter(Boolean),
    meeting_books: undefined,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(`*, ${BOOKS_SELECT}, attendees(id, name, member_id)`)
    .order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(transformMeeting));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json();
  const { title, date, location, book_ids, summary } = body;
  if (!title || !date) return NextResponse.json({ error: "제목과 날짜는 필수입니다." }, { status: 400 });

  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({ title, date, location: location || null, summary: summary || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (book_ids?.length) {
    await supabase.from("meeting_books").insert(
      (book_ids as number[]).map((bid) => ({ meeting_id: meeting.id, book_id: bid }))
    );
  }

  const { data: full } = await supabase
    .from("meetings")
    .select(`*, ${BOOKS_SELECT}`)
    .eq("id", meeting.id)
    .single();
  return NextResponse.json(transformMeeting(full), { status: 201 });
}
