import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { siteUrl } from "@/lib/site";

// 모임·독후감이 수시로 늘어난다. 정적으로 굳히지 않는다.
export const dynamic = "force-dynamic";

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
    const supabase = await createClient();
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
      lastModified: r.created_at ? new Date(r.created_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...meetings, ...reviews];
  } catch {
    // DB 가 흔들려도 사이트맵 자체는 살아 있어야 한다.
    return staticRoutes;
  }
}
