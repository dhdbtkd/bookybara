import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("book_categories").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "카테고리 이름을 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("book_categories")
    .insert({ name: name.trim(), color: color ?? "#6B7280" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
