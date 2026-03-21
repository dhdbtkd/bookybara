import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("book_candidates").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { title, author, proposed_by, notes, cover_url } = await req.json();
  if (!title?.trim() || !author?.trim() || !proposed_by?.trim()) {
    return NextResponse.json({ error: "제목, 저자, 제안자는 필수입니다." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("book_candidates")
    .insert({ title: title.trim(), author: author.trim(), proposed_by: proposed_by.trim(), notes: notes?.trim() || null, cover_url: cover_url?.trim() || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
