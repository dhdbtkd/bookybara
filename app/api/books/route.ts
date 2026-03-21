import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function fetchHiresCover(isbn: string): Promise<string | null> {
  if (!isbn) return null;
  const cleanIsbn = isbn.split(" ")[0]; // Kakao ISBN은 "ISBN10 ISBN13" 형태일 수 있음
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}&fields=items/volumeInfo/imageLinks`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const thumbnail: string | undefined = json.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    if (!thumbnail) return null;
    // zoom=1 → zoom=0 으로 바꾸면 더 큰 이미지
    return thumbnail.replace("zoom=1", "zoom=0").replace("http://", "https://");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json();
  const { title, author, cover_url, description, isbn } = body;
  if (!title || !author) return NextResponse.json({ error: "제목과 저자는 필수입니다." }, { status: 400 });

  const cover_url_hires = isbn ? await fetchHiresCover(isbn) : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .insert({ title, author, cover_url, cover_url_hires, isbn: isbn || null, description })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
