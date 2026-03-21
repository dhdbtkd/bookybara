import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, books(id, title, author, cover_url), attendees(id, name, member_id)")
    .order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json();
  const { title, date, location, book_id, summary } = body;
  if (!title || !date) return NextResponse.json({ error: "제목과 날짜는 필수입니다." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({ title, date, location, book_id: book_id || null, summary })
    .select("*, books(id, title, author, cover_url)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
