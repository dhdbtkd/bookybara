import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/site";

// 사이트맵은 쿠키를 읽을 이유가 없다. 쿠키 기반 서버 클라이언트를 쓰면
// 라우트가 완전 동적이 되고, 배포 환경에 따라 경로 자체가 누락되기도 한다.
// 공개 키로 직접 붙고 한 시간마다 다시 만든다.
export const revalidate = 3600;

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/meetings`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/reviews`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/candidates`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/discussion`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${siteUrl}/archive`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = publicClient();
    const [meetingsRes, reviewsRes] = await Promise.all([
      supabase.from("meetings").select("id, date").order("date", { ascending: false }),
      supabase.from("reviews").select("id, created_at").order("created_at", { ascending: false }),
    ]);

    const meetings: MetadataRoute.Sitemap = (meetingsRes.data ?? []).map((m) => ({
      url: `${siteUrl}/meetings/${m.id}`,
      lastModified: new Date(`${m.date}T00:00:00`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const reviews: MetadataRoute.Sitemap = (reviewsRes.data ?? []).map((r) => ({
      url: `${siteUrl}/reviews/${r.id}`,
      lastModified: r.created_at ? new Date(r.created_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...meetings, ...reviews];
  } catch {
    // DB 가 흔들려도 사이트맵 자체는 살아 있어야 한다.
    return staticRoutes;
  }
}
