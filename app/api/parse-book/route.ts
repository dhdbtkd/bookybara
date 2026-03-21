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

  // 저자 역할 분류
  const AUTHOR_ROLES = /^(저|글|지음|엮음|원작|글·그림)$/;
  const SKIP_ROLES = /^(역|번역|옮김|편역|그림|사진|감수|편집|해설|구성)$/;

  function extractAuthors(raw: string): string {
    // "모건 하우절 저 · 이지연 역" 형태 파싱
    const parts = raw.split(/[·,·]/).map((s) => s.trim()).filter(Boolean);
    const authors: string[] = [];
    for (const part of parts) {
      // 마지막 토큰이 역할어인지 확인
      const tokens = part.split(/\s+/);
      const role = tokens[tokens.length - 1];
      if (SKIP_ROLES.test(role)) continue;
      const name = AUTHOR_ROLES.test(role) ? tokens.slice(0, -1).join(" ") : part;
      if (name) authors.push(name.trim());
    }
    return authors.join(", ");
  }

  let author = "";

  // JSON-LD 우선 파싱
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      const data = Array.isArray(ld) ? ld[0] : ld;
      if (data.author) {
        const raw = Array.isArray(data.author)
          ? data.author.map((a: { name?: string } | string) => (typeof a === "string" ? a : a.name ?? "")).join(" · ")
          : typeof data.author === "string" ? data.author : data.author?.name ?? "";
        author = extractAuthors(raw);
      }
    } catch { /* ignore */ }
  }

  // HTML 패턴 폴백
  if (!author) {
    const rawMatch =
      html.match(/class="[^"]*author[^"]*"[^>]*>([^<]{2,80})<\//) ||
      html.match(/저자[^>]*>([^<]{2,80})<\//) ||
      html.match(/지은이[^>]*>([^<]{2,80})</);
    if (rawMatch) author = extractAuthors(rawMatch[1]);
  }

  if (!title) return NextResponse.json({ error: "책 정보를 파싱할 수 없습니다." }, { status: 422 });

  // 제목에서 " - 교보문고" 같은 suffix 제거
  const cleanTitle = title.replace(/\s*[-|]\s*교보문고.*$/i, "").trim();

  return NextResponse.json({ title: cleanTitle, author, cover_url: image || null, description: description || null });
}
