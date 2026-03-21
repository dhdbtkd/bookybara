import { NextRequest, NextResponse } from "next/server";

export type BookSource = {
  hiresUrl: string | null;
  description: string | null;
};

export type BookDetailResponse = {
  naver: BookSource | null;
  naverKeyMissing?: boolean;
  google: BookSource | null;
  kyobo: { hiresUrl: string | null } | null;
};

export function isNaverKeyConfigured() {
  return !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

async function fetchNaver(isbn: string): Promise<BookSource | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn}`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const item = json.items?.[0];
    if (!item) return null;
    return {
      hiresUrl: item.image || null,
      description: item.description || null,
    };
  } catch {
    return null;
  }
}

async function fetchGoogle(isbn: string): Promise<BookSource | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&fields=items/volumeInfo(description,imageLinks)`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const info = json.items?.[0]?.volumeInfo;
    if (!info) return null;
    const hiresUrl = info.imageLinks?.thumbnail
      ? info.imageLinks.thumbnail.replace("zoom=1", "zoom=0").replace("http://", "https://")
      : null;
    return {
      hiresUrl,
      description: info.description || null,
    };
  } catch {
    return null;
  }
}

async function fetchKyobo(isbn: string): Promise<{ hiresUrl: string | null } | null> {
  try {
    const res = await fetch(`https://product.kyobobook.co.kr/detail/${isbn}`, {
      headers: {
        // 봇 차단 우회용 일반 브라우저 UA
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // <div class="portrait_img_box portrait"> ... <img src="..." ...> 패턴 추출
    const sectionMatch = html.match(/portrait_img_box[\s\S]{0,300}?<img[^>]+src="([^"]+)"/);
    const imgUrl = sectionMatch?.[1] ?? null;

    return { hiresUrl: imgUrl };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get("isbn")?.trim();
  if (!isbn) return NextResponse.json({ error: "isbn이 필요합니다." }, { status: 400 });

  // Kakao ISBN은 "ISBN10 ISBN13" 형태 — 13자리 우선 사용
  const cleanIsbn = isbn.split(" ").find((s) => s.length === 13) ?? isbn.split(" ")[0];

  const naverKeyMissing = !isNaverKeyConfigured();
  const [naver, google, kyobo] = await Promise.all([
    naverKeyMissing ? Promise.resolve(null) : fetchNaver(cleanIsbn),
    fetchGoogle(cleanIsbn),
    fetchKyobo(cleanIsbn),
  ]);

  return NextResponse.json({ naver, naverKeyMissing, google, kyobo } satisfies BookDetailResponse);
}
