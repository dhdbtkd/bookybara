import { NextRequest, NextResponse } from "next/server";

export type BookSource = {
  hiresUrl: string | null;
  description: string | null;
};

export type BookDetailResponse = {
  naver: BookSource | null;
  naverKeyMissing?: boolean;
  naverError?: string;
  google: BookSource | null;
  googleError?: string;
  kyobo: { hiresUrl: string | null } | null;
};

export function isNaverKeyConfigured() {
  return !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

async function fetchNaver(isbn: string): Promise<{ result: BookSource | null; error?: string }> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { result: null };

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
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { result: null, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = await res.json();
    const item = json.items?.[0];
    if (!item) return { result: null, error: `결과 없음 (total: ${json.total ?? "?"})` };
    return {
      result: {
        hiresUrl: item.image || null,
        description: item.description || null,
      },
    };
  } catch (e) {
    return { result: null, error: String(e) };
  }
}

async function fetchGoogle(isbn: string): Promise<BookSource | null> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${apiKey}` : "";
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${keyParam}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const info = json.items?.[0]?.volumeInfo;
    if (!info) return null;
    const rawImg =
      info.imageLinks?.extraLarge ??
      info.imageLinks?.large ??
      info.imageLinks?.medium ??
      info.imageLinks?.small ??
      info.imageLinks?.thumbnail ??
      info.imageLinks?.smallThumbnail ??
      null;
    const hiresUrl = rawImg
      ? rawImg.replace("zoom=1", "zoom=0").replace("http://", "https://")
      : null;
    return {
      hiresUrl,
      description: info.description || null,
    };
  } catch {
    return null;
  }
}

function fetchKyobo(isbn: string): { hiresUrl: string } {
  return { hiresUrl: `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg` };
}

export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get("isbn")?.trim();
  if (!isbn) return NextResponse.json({ error: "isbn이 필요합니다." }, { status: 400 });

  // search-book에서 이미 ISBN13으로 정제해서 넘어오지만, 혹시 공백 포함 시 방어 처리
  const cleanIsbn = isbn.includes(" ") ? isbn.split(" ")[1] : isbn;

  const naverKeyMissing = !isNaverKeyConfigured();
  const kyobo = fetchKyobo(cleanIsbn);
  const [naverRes, google] = await Promise.all([
    naverKeyMissing ? Promise.resolve({ result: null }) : fetchNaver(cleanIsbn),
    fetchGoogle(cleanIsbn),
  ]);

  return NextResponse.json({
    naver: naverRes.result,
    naverKeyMissing,
    naverError: naverRes.error,
    google,
    kyobo,
  } satisfies BookDetailResponse);
}
