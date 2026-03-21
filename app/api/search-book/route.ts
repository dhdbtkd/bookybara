import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ error: "query가 필요합니다." }, { status: 400 });

  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });

  const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=8`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) return NextResponse.json({ error: "검색 실패" }, { status: res.status });

  const json = await res.json();
  function getHiResThumbnail(url: string): string {
    if (!url) return url;
    // R120x174.q85 → R400x574.q95 (원본 비율 유지)
    return url.replace(/\/thumb\/R\d+x\d+[^/]*\//, "/thumb/R400x574.q95/");
  }

  const books = (json.documents ?? []).map((d: {
    title: string;
    authors: string[];
    translators: string[];
    publisher: string;
    datetime: string;
    thumbnail: string;
    isbn: string;
    contents: string;
    price: number;
  }) => ({
    title: d.title,
    authors: d.authors ?? [],
    translators: d.translators ?? [],
    publisher: d.publisher,
    published_at: d.datetime ? d.datetime.slice(0, 10) : null,
    thumbnail: d.thumbnail ? getHiResThumbnail(d.thumbnail) : null,
    isbn: d.isbn,
    description: d.contents || null,
    price: d.price,
  }));

  return NextResponse.json(books);
}
