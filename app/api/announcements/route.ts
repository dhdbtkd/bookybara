import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { title, content, is_pinned } = await req.json();
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title: title.trim(), content: content.trim(), is_pinned: !!is_pinned })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
