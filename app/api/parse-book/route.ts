import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });

  if (!url.includes("kyobobook.co.kr")) {
    return NextResponse.json({ error: "교보문고 링크만 지원합니다." }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "페이지를 가져올 수 없습니다." }, { status: 502 });
  }

  function getMeta(property: string): string {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i");
    return (html.match(re)?.[1] ?? html.match(re2)?.[1] ?? "").trim();
  }

  const title = getMeta("og:title") || getMeta("twitter:title");
  const image = getMeta("og:image") || getMeta("twitter:image");
  const description = getMeta("og:description") || getMeta("twitter:description");

  // 저자: "저자명 저" 패턴 파싱
  const authorMatch = html.match(/class="[^"]*author[^"]*"[^>]*>([^<]{2,30})<\//) ||
    html.match(/"author"\s*:\s*"([^"]{2,50})"/) ||
    html.match(/저자[^>]*>([^<]{2,30})<\//) ||
    html.match(/지은이[^>]*>([^<]{2,30})</);
  let author = authorMatch?.[1]?.replace(/\s*저$/, "").replace(/\s*글$/, "").trim() ?? "";

  // JSON-LD 파싱 시도
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      const data = Array.isArray(ld) ? ld[0] : ld;
      if (!author && data.author) {
        author = Array.isArray(data.author)
          ? data.author.map((a: { name?: string } | string) => (typeof a === "string" ? a : a.name ?? "")).join(", ")
          : typeof data.author === "string" ? data.author : data.author?.name ?? "";
      }
    } catch { /* ignore */ }
  }

  if (!title) return NextResponse.json({ error: "책 정보를 파싱할 수 없습니다." }, { status: 422 });

  // 제목에서 " - 교보문고" 같은 suffix 제거
  const cleanTitle = title.replace(/\s*[-|]\s*교보문고.*$/i, "").trim();

  return NextResponse.json({ title: cleanTitle, author, cover_url: image || null, description: description || null });
}
