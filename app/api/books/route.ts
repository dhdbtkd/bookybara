import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json();
  const { title, author, cover_url, cover_url_hires, description, isbn } = body;
  if (!title || !author) return NextResponse.json({ error: "제목과 저자는 필수입니다." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .insert({ title, author, cover_url, cover_url_hires: cover_url_hires || null, isbn: isbn || null, description })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
