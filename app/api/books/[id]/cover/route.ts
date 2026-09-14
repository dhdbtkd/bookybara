import { createClient } from "@/utils/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("cover_url, cover_url_hires")
    .eq("id", id)
    .single();

  const source = book?.cover_url_hires ?? book?.cover_url;
  if (!source) return new Response(null, { status: 404 });

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return new Response(null, { status: 404 });
  }
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    return new Response(null, { status: 400 });
  }

  try {
    const upstream = await fetch(sourceUrl, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return new Response(null, { status: 502 });
    }

    return new Response(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
