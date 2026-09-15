import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리자·API·작성 폼은 검색 결과에 있을 이유가 없다.
      disallow: ["/admin", "/admin/", "/api/", "/reviews/new"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
