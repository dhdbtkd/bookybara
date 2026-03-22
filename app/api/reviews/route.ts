import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const meetingId = searchParams.get("meetingId");
  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select("*, books(title, author, cover_url, cover_url_hires), meetings(title, date, location)")
    .order("created_at", { ascending: false });

  if (bookId) query = query.eq("book_id", bookId);
  if (meetingId) query = query.eq("meeting_id", meetingId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { book_id, meeting_id, author_name, content } = await req.json();
  if (!book_id || !author_name?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert({ book_id, meeting_id: meeting_id || null, author_name: author_name.trim(), content: content.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
